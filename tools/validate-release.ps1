param(
    [switch]$SkipBuild,
    [string]$MakeCodeCommand = "makecode"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$failures = [System.Collections.Generic.List[string]]::new()

function Add-Failure([string]$message) {
    $script:failures.Add($message)
}

function Get-ChoiceCounts([string]$source, [string]$fileName) {
    $needle = "story.showPlayerChoices("
    $searchAt = 0
    while ($true) {
        $callAt = $source.IndexOf($needle, $searchAt)
        if ($callAt -lt 0) {
            break
        }

        $index = $callAt + $needle.Length
        $depth = 1
        $argumentCount = 1
        $quote = [char]0
        $escaped = $false
        while ($index -lt $source.Length -and $depth -gt 0) {
            $character = $source[$index]
            if ($quote -ne [char]0) {
                if ($escaped) {
                    $escaped = $false
                } elseif ($character -eq '\') {
                    $escaped = $true
                } elseif ($character -eq $quote) {
                    $quote = [char]0
                }
            } elseif ($character -eq '"' -or $character -eq "'" -or
                $character -eq '`') {
                $quote = $character
            } elseif ($character -eq '(' -or $character -eq '[' -or
                $character -eq '{') {
                $depth += 1
            } elseif ($character -eq ')' -or $character -eq ']' -or
                $character -eq '}') {
                $depth -= 1
            } elseif ($character -eq ',' -and $depth -eq 1) {
                $argumentCount += 1
            }
            $index += 1
        }

        if ($depth -ne 0) {
            Add-Failure "$fileName has an unterminated showPlayerChoices call."
            break
        }
        if ($argumentCount -gt 4) {
            $line = ($source.Substring(0, $callAt) -split "`n").Count
            Add-Failure "$fileName`:$line passes $argumentCount choices; Story menus support at most four visible choices."
        }
        $searchAt = $index
    }
}

Write-Host "Validating MakeCode Racing release contracts..."

$pxtPath = Join-Path $projectRoot "pxt.json"
$pxt = Get-Content -LiteralPath $pxtPath -Raw | ConvertFrom-Json
$listedFiles = @($pxt.files)
$duplicateFiles = $listedFiles | Group-Object | Where-Object Count -gt 1
foreach ($duplicate in $duplicateFiles) {
    Add-Failure "pxt.json lists '$($duplicate.Name)' more than once."
}
foreach ($relativePath in $listedFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $relativePath))) {
        Add-Failure "pxt.json references missing file '$relativePath'."
    }
}

$sourceFiles = Get-ChildItem -LiteralPath $projectRoot -Filter "*.ts" -File |
    Where-Object { $_.Name -notlike "*.g.ts" }
foreach ($sourceFile in $sourceFiles) {
    if ($listedFiles -notcontains $sourceFile.Name) {
        Add-Failure "Source file '$($sourceFile.Name)' is not listed in pxt.json."
    }
    Get-ChoiceCounts (Get-Content -LiteralPath $sourceFile.FullName -Raw) $sourceFile.Name
}

foreach ($jresName in @("images.g.jres", "tilemap.g.jres")) {
    $jresPath = Join-Path $projectRoot $jresName
    try {
        $jres = Get-Content -LiteralPath $jresPath -Raw | ConvertFrom-Json
        foreach ($property in $jres.PSObject.Properties) {
            if ($property.Name -eq "*") {
                continue
            }
            $data = $property.Value.data
            if ($data) {
                try {
                    [void][Convert]::FromBase64String($data)
                } catch {
                    Add-Failure "$jresName resource '$($property.Name)' has invalid base64 data."
                }
            }
        }
    } catch {
        Add-Failure "$jresName is not valid JSON: $($_.Exception.Message)"
    }
}

$garageSource = Get-Content -LiteralPath (Join-Path $projectRoot "garage.ts") -Raw
if ($garageSource -notmatch '"Parts",\s*"Paint",\s*"More",\s*"Drive"') {
    Add-Failure "Garage page one no longer keeps More third and Drive fourth."
}
if ($garageSource -notmatch '"Player Stats",\s*"Settings",\s*"More",\s*"Drive"') {
    Add-Failure "Garage page two no longer keeps More third and Drive fourth."
}

if (-not $SkipBuild) {
    $makeCode = Get-Command $MakeCodeCommand -ErrorAction SilentlyContinue
    if ($makeCode) {
        Push-Location $projectRoot
        try {
            & $makeCode.Source build --java-script --always-built
            if ($LASTEXITCODE -ne 0) {
                Add-Failure "MakeCode JavaScript build failed with exit code $LASTEXITCODE."
            }
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "MakeCode command '$MakeCodeCommand' not found; static checks still ran."
        Write-Host "Pass -MakeCodeCommand with a local CLI path or use -SkipBuild to silence this note."
    }
}

if ($failures.Count -gt 0) {
    Write-Error ("Release validation failed:`n - " + ($failures -join "`n - "))
    exit 1
}

Write-Host "Release validation passed."
