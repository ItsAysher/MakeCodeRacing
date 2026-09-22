#!/usr/bin/env node

/**
 * Controller-driven smoke test for the local MakeCode Arcade simulator.
 *
 * This intentionally has no npm dependencies. It starts an already-installed
 * MakeCode CLI, launches a local Chromium-family browser in headless mode, and
 * drives the simulator through the Chrome DevTools Protocol (CDP).
 */

import assert from "node:assert/strict"
import crypto from "node:crypto"
import fs from "node:fs"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import process from "node:process"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { runRacePauseChecks } from "./smoke-race-pause.mjs"

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const TOOLS_DIRECTORY = path.dirname(SCRIPT_PATH)
const PROJECT_ROOT = path.dirname(TOOLS_DIRECTORY)
const BASELINE_PATH = path.join(TOOLS_DIRECTORY, "simulator-smoke-baseline.json")

const CHECKPOINTS = [
    "new-game-intro",
    "name-entry-message",
    "start-menu",
    "garage-page-1",
    "garage-page-2",
    "settings-page-1",
    "settings-page-2",
    "accessibility-page-1",
    "accessibility-page-2",
    "settings-after-back",
    "garage-after-back",
    "drive-modes",
    "race-list",
    "race-field-card",
    "race-reverse-card",
    "race-intro"
]

const options = parseArguments(process.argv.slice(2))
if (options.help) {
    printHelp()
    process.exit(0)
}

let makeCodeProcess
let browserProcess
let cdp
let temporaryProfile
let temporaryArtifacts
const processOutput = {
    makeCode: [],
    browser: []
}

async function run() {
    assert.equal(
        process.cwd(),
        PROJECT_ROOT,
        `Run this script from the project root: ${PROJECT_ROOT}`
    )
    assertSourceMenuContracts()

    const makeCode = findMakeCodeCli()
    const browser = findBrowser()
    const serverPort = options.serverPort || await reservePort()
    const debugPort = options.debugPort || await reservePort()
    const serverUrl = `http://127.0.0.1:${serverPort}/`

    temporaryProfile = fs.mkdtempSync(
        path.join(os.tmpdir(), "makecode-racing-smoke-profile-")
    )
    temporaryArtifacts = options.artifacts || fs.mkdtempSync(
        path.join(os.tmpdir(), "makecode-racing-smoke-artifacts-")
    )
    fs.mkdirSync(temporaryArtifacts, { recursive: true })

    console.log(`MakeCode CLI: ${makeCode.description}`)
    console.log(`Browser: ${browser}`)
    console.log(`Simulator: ${serverUrl}`)
    console.log(`Artifacts: ${temporaryArtifacts}`)

    // `serve --no-watch` serves an existing binary; it does not rebuild it.
    // Always compile first so lifecycle assertions test the current sources.
    makeCodeProcess = startMakeCode(makeCode, ["build", "--java-script", "--always-built"])
    await waitUntil(async () => makeCodeProcess.exitCode !== null,
        options.startupTimeout, "MakeCode JavaScript build did not finish")
    assert.equal(makeCodeProcess.exitCode, 0, "MakeCode JavaScript build failed")
    makeCodeProcess = startMakeCode(makeCode, ["serve", "--no-watch", "--port", String(serverPort)])
    await waitForHttp(serverUrl, options.startupTimeout, "MakeCode simulator")

    browserProcess = startBrowser(browser, debugPort, temporaryProfile, serverUrl)
    const page = await waitForBrowserPage(debugPort, serverUrl, options.startupTimeout)
    cdp = await CdpConnection.connect(page.webSocketDebuggerUrl)
    await cdp.call("Page.enable")
    await cdp.call("Runtime.enable")
    await cdp.call("Log.enable")

    const browserErrors = []
    cdp.on("Runtime.exceptionThrown", event => {
        browserErrors.push(event.exceptionDetails?.text || "Uncaught browser exception")
    })
    cdp.on("Log.entryAdded", event => {
        if (event.entry?.level === "error" &&
            !/Failed to load resource:.*404/.test(event.entry.text)) {
            browserErrors.push(event.entry.text)
        }
    })

    await waitForSimulatorCanvas(options.startupTimeout)
    const actual = {}
    let previous

    previous = await checkpoint("new-game-intro", actual)

    await pressController("A")
    previous = await checkpoint("name-entry-message", actual, previous.hash)

    await pressController("A")
    await waitForTextInput(options.transitionTimeout)
    await typePlayerName("Smoke")
    previous = await checkpoint("start-menu", actual, previous.hash)

    // Start Game is selected by default.
    await pressController("A")
    previous = await checkpoint("garage-page-1", actual, previous.hash)

    // Garage page 1: Parts, Paint, More, Drive.
    await chooseMenuIndex(2)
    previous = await checkpoint("garage-page-2", actual, previous.hash)

    // Garage page 2: Player Stats, Settings, More, Drive.
    await chooseMenuIndex(1)
    previous = await checkpoint("settings-page-1", actual, previous.hash)

    // Settings page 1: Sound, Accessibility, More, Back.
    await chooseMenuIndex(2)
    previous = await checkpoint("settings-page-2", actual, previous.hash)

    // Settings page 2: Camera Shake, Driving Assists, More, Back.
    // More wraps to page 1, proving that the extended menu remains navigable.
    await chooseMenuIndex(2)
    await waitForCanvasHash(actual["settings-page-1"].sha256)

    // Accessibility is the second item on settings page 1.
    await chooseMenuIndex(1)
    previous = await checkpoint("accessibility-page-1", actual, previous.hash)

    // Accessibility page 1: High Contrast, Camera Motion, More, Back.
    await chooseMenuIndex(2)
    previous = await checkpoint("accessibility-page-2", actual, previous.hash)

    // Back is the fourth item and returns to Settings page 1.
    await chooseMenuIndex(3)
    previous = await checkpoint("settings-after-back", actual, previous.hash)
    assert.equal(
        previous.hash,
        actual["settings-page-1"].sha256,
        "Accessibility Back did not return to Settings page 1"
    )

    // Back from Settings returns to Garage page 2.
    await chooseMenuIndex(3)
    previous = await checkpoint("garage-after-back", actual, previous.hash)
    assert.equal(
        previous.hash,
        actual["garage-page-2"].sha256,
        "Settings Back did not return to Garage page 2"
    )

    // Drive is always the fourth item on both Garage pages.
    await chooseMenuIndex(3)
    previous = await checkpoint("drive-modes", actual, previous.hash)

    // Races is selected by default.
    await chooseMenuIndex(0)
    previous = await checkpoint("race-list", actual, previous.hash)

    // Beginner is selected by default. Toggle its layout, then launch it.
    await chooseMenuIndex(0)
    previous = await checkpoint("race-field-card", actual, previous.hash)
    await chooseMenuIndex(1)
    previous = await checkpoint("race-reverse-card", actual, previous.hash)
    await chooseMenuIndex(0)
    previous = await checkpoint("race-intro", actual, previous.hash)

    assertNoDuplicateUnexpectedStates(actual)
    if (browserErrors.length) {
        throw new Error(`Browser reported errors:\n${browserErrors.join("\n")}`)
    }

    if (!options.updateBaseline) compareBaseline(actual)

    await runRacePauseChecks({
        evaluate, pressController, waitUntil, sleep,
        captureCanvas, waitForStableCanvas,
        expectedScreens: actual,
        artifacts: temporaryArtifacts, timeout: options.transitionTimeout
    })
    assert.equal(browserErrors.length, 0, `Browser reported errors: ${browserErrors.join("\n")}`)

    // Never accept new screenshots from a run that failed lifecycle checks.
    if (options.updateBaseline) {
        const baseline = {
            schemaVersion: 1,
            canvas: { width: previous.width, height: previous.height },
            checkpoints: Object.fromEntries(
                CHECKPOINTS.map(name => [name, actual[name]])
            )
        }
        fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`)
        console.log(`Updated visual baseline: ${BASELINE_PATH}`)
    }

    console.log(`\nPASS: ${CHECKPOINTS.length} controller-driven simulator checkpoints verified.`)
    console.log("Route: new game -> Garage -> Settings -> Drive -> Reverse Race -> grid pause -> live pause -> restart -> Garage")

    if (!options.keepArtifacts && !options.artifacts) {
        fs.rmSync(temporaryArtifacts, { recursive: true, force: true })
        temporaryArtifacts = undefined
    }
}

function parseArguments(arguments_) {
    const parsed = {
        help: false,
        updateBaseline: false,
        keepArtifacts: false,
        artifacts: undefined,
        serverPort: undefined,
        debugPort: undefined,
        startupTimeout: 60_000,
        transitionTimeout: 12_000
    }

    for (let index = 0; index < arguments_.length; index++) {
        const argument = arguments_[index]
        if (argument === "--help" || argument === "-h") {
            parsed.help = true
        } else if (argument === "--update-baseline") {
            parsed.updateBaseline = true
        } else if (argument === "--keep-artifacts") {
            parsed.keepArtifacts = true
        } else if (argument === "--artifacts") {
            parsed.artifacts = path.resolve(requireValue(arguments_, ++index, argument))
        } else if (argument === "--server-port") {
            parsed.serverPort = parsePort(requireValue(arguments_, ++index, argument))
        } else if (argument === "--debug-port") {
            parsed.debugPort = parsePort(requireValue(arguments_, ++index, argument))
        } else if (argument === "--startup-timeout") {
            parsed.startupTimeout = parsePositiveInteger(
                requireValue(arguments_, ++index, argument), argument
            )
        } else if (argument === "--transition-timeout") {
            parsed.transitionTimeout = parsePositiveInteger(
                requireValue(arguments_, ++index, argument), argument
            )
        } else {
            throw new Error(`Unknown argument: ${argument}. Use --help for usage.`)
        }
    }
    return parsed
}

function requireValue(arguments_, index, flag) {
    if (index >= arguments_.length) {
        throw new Error(`${flag} requires a value`)
    }
    return arguments_[index]
}

function parsePort(value) {
    const port = Number.parseInt(value, 10)
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error(`Invalid TCP port: ${value}`)
    }
    return port
}

function parsePositiveInteger(value, flag) {
    const number = Number.parseInt(value, 10)
    if (!Number.isInteger(number) || number < 1) {
        throw new Error(`${flag} must be a positive integer`)
    }
    return number
}

function printHelp() {
    console.log(`Usage: node tools/smoke-simulator.mjs [options]

Runs a clean-profile, controller-driven MakeCode Arcade simulator smoke test.
Uses the installed toolchain; MakeCode may refresh its compiler cache.

Options:
  --update-baseline          Replace the checked-in canvas pixel baselines
  --keep-artifacts           Keep PNG screenshots after a successful run
  --artifacts <directory>    Write screenshots to a specific directory
  --server-port <port>       Override the automatically selected server port
  --debug-port <port>        Override the browser debugging port
  --startup-timeout <ms>     Startup timeout (default: 60000)
  --transition-timeout <ms>  Per-screen timeout (default: 12000)
  -h, --help                 Show this help

Environment:
  MAKECODE_CLI               Path to makecode's cli.js
  MAKECODE_SMOKE_BROWSER     Path to Chrome, Edge, or Chromium

The simulator canvas has no accessible text tree. Semantic labels and ordering
are guarded in source, while runtime screens are asserted using exact 160x120
RGBA pixel hashes and saved as PNGs (only the intro's animated A prompt is
masked). Pause/restart checks read simulator state without mutating it.
Intentional visual changes require one reviewed run with --update-baseline.`)
}

function assertSourceMenuContracts() {
    const contracts = [
        {
            file: "garage.ts",
            expressions: [
                /story\.showPlayerChoices\(\s*"Parts"\s*,\s*"Paint"\s*,\s*"More"\s*,\s*"Drive"\s*\)/s,
                /story\.showPlayerChoices\(\s*"Player Stats"\s*,\s*"Settings"\s*,\s*"More"\s*,\s*"Drive"\s*\)/s
            ]
        },
        {
            file: "game_settings.ts",
            expressions: [
                /soundChoice\s*,\s*"Accessibility"\s*,\s*"More"\s*,\s*"Back"/s,
                /contrastChoice\s*,\s*motionChoice\s*,\s*"More"\s*,\s*"Back"/s,
                /effectsChoice\s*,\s*cuesChoice\s*,\s*"More"\s*,\s*"Back"/s
            ]
        },
        {
            file: "garage_mode_selection.ts",
            expressions: [
                /story\.showPlayerChoices\(\s*"Races"\s*,\s*freeRoamChoice\s*,\s*championshipChoice\s*,\s*"Back"\s*\)/s
            ]
        }
    ]

    for (const contract of contracts) {
        const filePath = path.join(PROJECT_ROOT, contract.file)
        const source = fs.readFileSync(filePath, "utf8")
        for (const expression of contract.expressions) {
            assert.match(
                source,
                expression,
                `Menu contract missing from ${contract.file}: ${expression}`
            )
        }
    }
}

function findMakeCodeCli() {
    const explicit = process.env.MAKECODE_CLI
    if (explicit) {
        const resolved = path.resolve(explicit)
        assert.ok(fs.existsSync(resolved), `MAKECODE_CLI does not exist: ${resolved}`)
        return makeCodeDescriptor(resolved)
    }

    const directCandidates = [
        path.join(PROJECT_ROOT, "node_modules", "makecode", "built", "cli.js"),
        path.join(PROJECT_ROOT, "node_modules", "@makecode", "cli", "built", "cli.js")
    ]
    for (const candidate of directCandidates) {
        if (fs.existsSync(candidate)) {
            return makeCodeDescriptor(candidate)
        }
    }

    const searchRoots = [
        process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "pnpm", "store"),
        process.env.APPDATA && path.join(process.env.APPDATA, "npm", "node_modules"),
        path.join(os.homedir(), ".local", "share", "pnpm", "store"),
        path.join(os.homedir(), "Library", "pnpm", "store")
    ].filter(Boolean)

    const candidates = []
    for (const root of searchRoots) {
        if (!fs.existsSync(root)) continue
        findFilesNamed(root, "cli.js", 9, candidates, filePath => {
            const normalized = filePath.replaceAll("\\", "/")
            return normalized.endsWith("/node_modules/makecode/built/cli.js")
        })
    }
    candidates.sort((left, right) => {
        return fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs
    })
    if (candidates.length) {
        return makeCodeDescriptor(candidates[0])
    }

    throw new Error(
        "No installed MakeCode CLI was found. Set MAKECODE_CLI to the cached makecode built/cli.js path. " +
        "The smoke test will not download dependencies."
    )
}

function makeCodeDescriptor(cliPath) {
    return {
        command: process.execPath,
        prefixArguments: [cliPath],
        description: cliPath
    }
}

function findFilesNamed(directory, fileName, remainingDepth, output, accept) {
    if (remainingDepth < 0 || output.length >= 40) return
    let entries
    try {
        entries = fs.readdirSync(directory, { withFileTypes: true })
    } catch {
        return
    }
    for (const entry of entries) {
        const filePath = path.join(directory, entry.name)
        if (entry.isFile() && entry.name === fileName && accept(filePath)) {
            output.push(filePath)
        } else if (entry.isDirectory()) {
            findFilesNamed(filePath, fileName, remainingDepth - 1, output, accept)
        }
    }
}

function findBrowser() {
    const explicit = process.env.MAKECODE_SMOKE_BROWSER
    if (explicit) {
        const resolved = path.resolve(explicit)
        assert.ok(fs.existsSync(resolved), `MAKECODE_SMOKE_BROWSER does not exist: ${resolved}`)
        return resolved
    }

    const candidates = process.platform === "win32" ? [
        path.join(process.env["PROGRAMFILES(X86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
        path.join(process.env.PROGRAMFILES || "", "Microsoft", "Edge", "Application", "msedge.exe"),
        path.join(process.env.PROGRAMFILES || "", "Google", "Chrome", "Application", "chrome.exe"),
        path.join(process.env["PROGRAMFILES(X86)"] || "", "Google", "Chrome", "Application", "chrome.exe")
    ] : process.platform === "darwin" ? [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/Applications/Chromium.app/Contents/MacOS/Chromium"
    ] : [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/microsoft-edge",
        "/usr/bin/microsoft-edge-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser"
    ]

    const browser = candidates.find(candidate => candidate && fs.existsSync(candidate))
    if (!browser) {
        throw new Error(
            "No Chromium-family browser was found. Set MAKECODE_SMOKE_BROWSER to Chrome, Edge, or Chromium."
        )
    }
    return browser
}

function startMakeCode(makeCode, arguments_) {
    const child = spawn(
        makeCode.command,
        [...makeCode.prefixArguments, ...arguments_],
        {
            cwd: PROJECT_ROOT,
            env: { ...process.env, NO_COLOR: "1" },
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true
        }
    )
    captureProcessOutput(child, processOutput.makeCode)
    return child
}

function startBrowser(browser, port, profile, url) {
    const child = spawn(browser, [
        "--headless=new",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-sync",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-features=msEdgeFirstRunExperience,msEdgeSignin,msEdgeSync",
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${profile}`,
        url
    ], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
    })
    captureProcessOutput(child, processOutput.browser)
    return child
}

function captureProcessOutput(child, destination) {
    const append = chunk => {
        const text = String(chunk)
        destination.push(text)
        while (destination.join("").length > 24_000) destination.shift()
    }
    child.stdout?.on("data", append)
    child.stderr?.on("data", append)
}

async function reservePort() {
    return await new Promise((resolve, reject) => {
        const server = net.createServer()
        server.unref()
        server.once("error", reject)
        server.listen(0, "127.0.0.1", () => {
            const address = server.address()
            server.close(error => error ? reject(error) : resolve(address.port))
        })
    })
}

async function waitForHttp(url, timeout, description) {
    await waitUntil(async () => {
        try {
            const response = await fetch(url)
            return response.ok
        } catch {
            return false
        }
    }, timeout, `${description} did not become available at ${url}`)
}

async function waitForBrowserPage(port, serverUrl, timeout) {
    let found
    await waitUntil(async () => {
        try {
            const response = await fetch(`http://127.0.0.1:${port}/json/list`)
            if (!response.ok) return false
            const pages = await response.json()
            found = pages.find(page => page.type === "page" && page.url.startsWith(serverUrl))
            return Boolean(found?.webSocketDebuggerUrl)
        } catch {
            return false
        }
    }, timeout, "Headless browser did not expose the MakeCode simulator page")
    return found
}

async function waitForSimulatorCanvas(timeout) {
    await waitUntil(async () => {
        const result = await evaluate(`(() => {
            const frame = document.querySelector("#simframe")
            const canvas = frame && frame.contentDocument &&
                frame.contentDocument.querySelector("#game-screen")
            return Boolean(
                document.body.dataset.state === "run" &&
                canvas && canvas.width === 160 && canvas.height === 120
            )
        })()`)
        return result === true
    }, timeout, "MakeCode simulator canvas did not reach the running state")
}

async function waitForTextInput(timeout) {
    await waitUntil(async () => {
        return await evaluate(`(() => {
            const frame = document.querySelector("#simframe")
            const input = frame && frame.contentDocument &&
                frame.contentDocument.querySelector('input[type="text"]')
            return Boolean(input && frame.contentDocument.activeElement === input)
        })()`)
    }, timeout, "Player-name input did not appear")
}

async function typePlayerName(name) {
    await cdp.call("Input.insertText", { text: name })
    await sleep(80)
    await cdp.call("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13
    })
    await cdp.call("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13
    })
    await sleep(200)
}

async function chooseMenuIndex(index) {
    assert.ok(index >= 0 && index <= 3, `Invalid four-slot menu index: ${index}`)
    for (let current = 0; current < index; current++) {
        await pressController("Down")
    }
    await pressController("A")
}

async function pressController(button, holdMilliseconds = 70) {
    const keys = {
        A: { key: "z", code: "KeyZ", keyCode: 90 },
        B: { key: "x", code: "KeyX", keyCode: 88 },
        Menu: { key: "`", code: "Backquote", keyCode: 192 },
        Up: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
        Down: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
        Left: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
        Right: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 }
    }
    const selected = keys[button]
    assert.ok(selected, `Unknown controller button: ${button}`)

    await evaluate(`(() => {
        const frame = document.querySelector("#simframe")
        frame.contentWindow.focus()
        frame.contentDocument.querySelector("#game-screen").focus()
    })()`)
    await cdp.call("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: selected.key,
        code: selected.code,
        windowsVirtualKeyCode: selected.keyCode,
        nativeVirtualKeyCode: selected.keyCode
    })
    await sleep(holdMilliseconds)
    await cdp.call("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: selected.key,
        code: selected.code,
        windowsVirtualKeyCode: selected.keyCode,
        nativeVirtualKeyCode: selected.keyCode
    })
    await sleep(170)
}

async function checkpoint(name, actual, differentFrom) {
    assert.ok(CHECKPOINTS.includes(name), `Unknown checkpoint: ${name}`)
    // Arcade bobs the splash's A prompt. Exclude only that tiny animated
    // region from its hash; keep the actual PNG and all other pixels intact.
    const ignoredRegion = name === "race-intro" ? { x: 144, y: 64, width: 16, height: 20 } : undefined
    const capture = await waitForStableCanvas(differentFrom, ignoredRegion)
    const fileName = `${String(CHECKPOINTS.indexOf(name) + 1).padStart(2, "0")}-${name}.png`
    fs.writeFileSync(path.join(temporaryArtifacts, fileName), capture.png)
    actual[name] = {
        sha256: capture.hash,
        width: capture.width,
        height: capture.height,
        colors: capture.colors
    }
    console.log(`  ${fileName}: ${capture.hash.slice(0, 16)} (${capture.colors} colors)`)
    return capture
}

async function waitForStableCanvas(differentFrom, ignoredRegion) {
    let previousHash
    let stableCount = 0
    let candidate
    const deadline = Date.now() + options.transitionTimeout

    while (Date.now() < deadline) {
        candidate = await captureCanvas(ignoredRegion)
        if (candidate.hash === previousHash) {
            stableCount += 1
        } else {
            previousHash = candidate.hash
            stableCount = 1
        }
        if (stableCount >= 3 && (!differentFrom || candidate.hash !== differentFrom)) {
            assert.equal(candidate.width, 160, "Simulator canvas width changed")
            assert.equal(candidate.height, 120, "Simulator canvas height changed")
            assert.ok(candidate.colors >= 2, "Simulator canvas is unexpectedly blank")
            return candidate
        }
        await sleep(120)
    }

    throw new Error(
        `Canvas did not settle${differentFrom ? " on a changed frame" : ""}; ` +
        `last hash was ${candidate?.hash || "unavailable"}`
    )
}

async function waitForCanvasHash(expectedHash) {
    await waitUntil(async () => {
        const capture = await captureCanvas()
        return capture.hash === expectedHash
    }, options.transitionTimeout, `Canvas did not return to expected state ${expectedHash}`)
}

async function captureCanvas(ignoredRegion) {
    const value = await evaluate(`(() => {
        const frame = document.querySelector("#simframe")
        const canvas = frame && frame.contentDocument &&
            frame.contentDocument.querySelector("#game-screen")
        if (!canvas) return { error: "game-screen canvas missing" }
        const context = canvas.getContext("2d", { willReadFrequently: true })
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
        let binary = ""
        const chunkSize = 0x4000
        for (let offset = 0; offset < pixels.length; offset += chunkSize) {
            binary += String.fromCharCode(...pixels.subarray(offset, offset + chunkSize))
        }
        return {
            width: canvas.width,
            height: canvas.height,
            rgba: btoa(binary),
            png: canvas.toDataURL("image/png").split(",")[1]
        }
    })()`)
    if (!value || value.error) {
        throw new Error(value?.error || "Could not capture simulator canvas")
    }
    const rgba = Buffer.from(value.rgba, "base64")
    const colors = new Set()
    for (let index = 0; index < rgba.length; index += 4) {
        colors.add(rgba.readUInt32BE(index))
    }
    if (ignoredRegion) {
        for (let y = ignoredRegion.y; y < ignoredRegion.y + ignoredRegion.height; y++) {
            rgba.fill(0, (y * value.width + ignoredRegion.x) * 4,
                (y * value.width + ignoredRegion.x + ignoredRegion.width) * 4)
        }
    }
    return {
        hash: crypto.createHash("sha256").update(rgba).digest("hex"),
        png: Buffer.from(value.png, "base64"),
        width: value.width,
        height: value.height,
        colors: colors.size
    }
}

function assertNoDuplicateUnexpectedStates(actual) {
    const allowedEqualPairs = new Set([
        "settings-after-back|settings-page-1",
        "garage-after-back|garage-page-2"
    ])
    for (let left = 0; left < CHECKPOINTS.length; left++) {
        for (let right = left + 1; right < CHECKPOINTS.length; right++) {
            const leftName = CHECKPOINTS[left]
            const rightName = CHECKPOINTS[right]
            if (actual[leftName].sha256 !== actual[rightName].sha256) continue
            const pair = [leftName, rightName].sort().join("|")
            assert.ok(
                allowedEqualPairs.has(pair),
                `Unexpected identical canvas states: ${leftName} and ${rightName}`
            )
        }
    }
}

function compareBaseline(actual) {
    assert.ok(
        fs.existsSync(BASELINE_PATH),
        `Visual baseline missing: ${BASELINE_PATH}. Review screenshots and run with --update-baseline.`
    )
    const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"))
    assert.equal(baseline.schemaVersion, 1, "Unsupported simulator smoke baseline schema")
    for (const name of CHECKPOINTS) {
        assert.ok(baseline.checkpoints[name], `Baseline checkpoint missing: ${name}`)
        // MakeCode's name prompt has a platform-timed blinking caret. Validate
        // its dimensions/colors but compare exact pixels only for static UI.
        if (name !== "name-entry-message") {
            assert.equal(
                actual[name].sha256,
                baseline.checkpoints[name].sha256,
                `Visual regression at ${name}; inspect ${path.join(temporaryArtifacts, `${name}.png`)}`
            )
        }
        assert.equal(actual[name].width, baseline.checkpoints[name].width)
        assert.equal(actual[name].height, baseline.checkpoints[name].height)
    }
}

async function evaluate(expression) {
    const response = await cdp.call("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true
    })
    if (response.exceptionDetails) {
        throw new Error(response.exceptionDetails.text || "Runtime.evaluate failed")
    }
    return response.result?.value
}

async function waitUntil(predicate, timeout, message) {
    const deadline = Date.now() + timeout
    let lastError
    while (Date.now() < deadline) {
        try {
            if (await predicate()) return
        } catch (error) {
            lastError = error
        }
        await sleep(100)
    }
    throw new Error(`${message}${lastError ? ` (${lastError.message})` : ""}`)
}

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function closeResources() {
    if (cdp) {
        try {
            await cdp.call("Browser.close")
        } catch {
            // Browser may already be gone.
        }
        cdp.close()
    }
    await stopChild(browserProcess)
    await stopChild(makeCodeProcess)
    if (temporaryProfile && fs.existsSync(temporaryProfile)) {
        await removeTemporaryDirectory(temporaryProfile)
    }
    if (temporaryArtifacts && !options.keepArtifacts && !options.artifacts) {
        await removeTemporaryDirectory(temporaryArtifacts)
    }
}

async function stopChild(child) {
    if (!child || child.exitCode !== null) return
    if (process.platform === "win32") {
        await new Promise(resolve => {
            const killer = spawn(
                "taskkill",
                ["/pid", String(child.pid), "/t", "/f"],
                { windowsHide: true, stdio: "ignore" }
            )
            killer.once("exit", resolve)
            killer.once("error", resolve)
        })
        return
    }
    child.kill("SIGTERM")
    await Promise.race([
        new Promise(resolve => child.once("exit", resolve)),
        sleep(2_000)
    ])
    if (child.exitCode === null) child.kill("SIGKILL")
}

async function removeTemporaryDirectory(directory) {
    for (let attempt = 0; attempt < 10; attempt++) {
        try {
            fs.rmSync(directory, { recursive: true, force: true })
            return
        } catch (error) {
            if (attempt == 9) {
                console.warn(`Could not remove temporary directory: ${directory}`)
                return
            }
            await sleep(200)
        }
    }
}

function printBufferedOutput(label, chunks) {
    if (!chunks.length) return
    console.error(`\n--- ${label} output ---`)
    console.error(chunks.join("").trim())
}

class CdpConnection {
    constructor(socket) {
        this.socket = socket
        this.nextId = 1
        this.pending = new Map()
        this.listeners = new Map()
        socket.addEventListener("message", event => this.handleMessage(event))
    }

    static async connect(url) {
        const socket = new WebSocket(url)
        await new Promise((resolve, reject) => {
            socket.addEventListener("open", resolve, { once: true })
            socket.addEventListener("error", reject, { once: true })
        })
        return new CdpConnection(socket)
    }

    call(method, params = {}) {
        const id = this.nextId++
        this.socket.send(JSON.stringify({ id, method, params }))
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(id)
                reject(new Error(`CDP call timed out: ${method}`))
            }, 15_000)
            this.pending.set(id, { resolve, reject, timeout })
        })
    }

    on(method, listener) {
        const listeners = this.listeners.get(method) || []
        listeners.push(listener)
        this.listeners.set(method, listeners)
    }

    close() {
        try {
            this.socket.close()
        } catch {
            // Already closed.
        }
    }

    handleMessage(event) {
        const message = JSON.parse(event.data)
        if (message.id && this.pending.has(message.id)) {
            const pending = this.pending.get(message.id)
            this.pending.delete(message.id)
            clearTimeout(pending.timeout)
            if (message.error) {
                pending.reject(new Error(`${message.error.message} (${message.error.code})`))
            } else {
                pending.resolve(message.result)
            }
            return
        }
        if (message.method) {
            for (const listener of this.listeners.get(message.method) || []) {
                listener(message.params || {})
            }
        }
    }
}

try {
    await run()
} catch (error) {
    console.error(`\nSMOKE TEST FAILED: ${error && error.stack ? error.stack : error}`)
    printBufferedOutput("MakeCode", processOutput.makeCode)
    printBufferedOutput("Browser", processOutput.browser)
    if (temporaryArtifacts) {
        console.error(`Screenshots retained at: ${temporaryArtifacts}`)
        temporaryArtifacts = undefined
    }
    process.exitCode = 1
} finally {
    await closeResources()
}
