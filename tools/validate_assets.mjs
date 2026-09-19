import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const toolsDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(toolsDirectory, "..")
const jresPath = path.join(projectRoot, "images.g.jres")
const bindingsPath = path.join(projectRoot, "images.g.ts")
const errors = []

function report(message) {
    errors.push(message)
}

function findDuplicates(values) {
    const counts = new Map()
    for (const value of values) {
        counts.set(value, (counts.get(value) || 0) + 1)
    }
    return [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([value]) => value)
}

function decodeBase64(data, assetLabel) {
    if (typeof data !== "string" || data.length === 0) {
        report(`[${assetLabel}] is missing base64 image data.`)
        return null
    }
    if (data.length % 4 !== 0 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
        report(`[${assetLabel}] has malformed base64 image data.`)
        return null
    }

    const buffer = Buffer.from(data, "base64")
    if (buffer.toString("base64") !== data) {
        report(`[${assetLabel}] has non-canonical or invalid base64 data.`)
        return null
    }
    return buffer
}

function decodeF4(entry, assetLabel) {
    if (entry.mimeType !== "image/x-mkcd-f4") {
        report(
            `[${assetLabel}] uses ${entry.mimeType || "no mimeType"}; ` +
            "expected image/x-mkcd-f4."
        )
        return null
    }
    if (entry.dataEncoding !== "base64") {
        report(
            `[${assetLabel}] uses ${entry.dataEncoding || "no dataEncoding"}; ` +
            "expected base64."
        )
    }

    const buffer = decodeBase64(entry.data, assetLabel)
    if (!buffer) {
        return null
    }
    if (buffer.length < 8) {
        report(`[${assetLabel}] F4 data is only ${buffer.length} bytes; expected an 8-byte header.`)
        return null
    }
    if (buffer[0] !== 0x87 || buffer[1] !== 0x04) {
        report(
            `[${assetLabel}] has an invalid F4 header ` +
            `(0x${buffer[0].toString(16)}, 0x${buffer[1].toString(16)}).`
        )
        return null
    }

    const width = buffer.readUInt16LE(2)
    const height = buffer.readUInt16LE(4)
    if (width <= 0 || height <= 0) {
        report(`[${assetLabel}] declares invalid dimensions ${width}x${height}.`)
        return null
    }

    if (buffer[6] !== 0 || buffer[7] !== 0) {
        report(
            `[${assetLabel}] has non-zero reserved F4 header bytes ` +
            `(${buffer[6]}, ${buffer[7]}).`
        )
    }

    // Arcade's native 4-bit image buffer is column-major. Each column stores
    // two vertical pixels per byte, and its byte height is aligned to four.
    // This is intentionally not the more obvious ceil(width * height / 2):
    // a 24x12 car needs a 24 * 8-byte payload, for example.
    const packedColumnHeight = Math.ceil(height / 2)
    const columnStride = (packedColumnHeight + 3) & ~3
    const expectedLength = 8 + width * columnStride
    if (buffer.length !== expectedLength) {
        report(
            `[${assetLabel}] declares ${width}x${height}, which needs ` +
            `${expectedLength} column-major F4 bytes, but contains ` +
            `${buffer.length}.`
        )
        return null
    }
    return { width, height, columnStride, buffer }
}

function unescapeTypeScriptString(value) {
    try {
        return JSON.parse(`"${value}"`)
    } catch {
        return value
    }
}

function parseGeneratedBindings(source) {
    const bindings = []
    const bindingPattern =
        /((?:\s*case\s+"(?:[^"\\]|\\.)*"\s*:\s*)+)return\s+img`([\s\S]*?)`\s*;/g
    let match
    while ((match = bindingPattern.exec(source)) !== null) {
        const names = []
        const casePattern = /case\s+"((?:[^"\\]|\\.)*)"\s*:/g
        let caseMatch
        while ((caseMatch = casePattern.exec(match[1])) !== null) {
            names.push(unescapeTypeScriptString(caseMatch[1]))
        }

        const rows = match[2]
            .split(/\r?\n/)
            // MakeCode emits both compact rows (".12f") and spaced rows
            // (". 1 2 f"). Whitespace is presentation, not a pixel.
            .map(row => row.replace(/\s/g, ""))
            .filter(row => row.length > 0)
        bindings.push({ names, rows })
    }
    return bindings
}

function localAssetId(id) {
    const separator = id.lastIndexOf(".")
    return separator >= 0 ? id.slice(separator + 1) : id
}

function pixelValue(character) {
    if (character === "." || character === "0") {
        return 0
    }
    return parseInt(character, 16)
}

function validateBindingPixels(asset, binding) {
    const { key, f4 } = asset
    if (binding.rows.length !== f4.height) {
        report(
            `[${key}] generated binding is ${binding.rows.length} rows high; ` +
            `JRES declares ${f4.height}.`
        )
        return
    }
    for (let y = 0; y < binding.rows.length; y++) {
        const row = binding.rows[y]
        if (row.length !== f4.width) {
            report(
                `[${key}] generated binding row ${y + 1} is ${row.length} pixels wide; ` +
                `JRES declares ${f4.width}.`
            )
            return
        }
        if (!/^[.0-9a-f]+$/i.test(row)) {
            report(`[${key}] generated binding row ${y + 1} contains an invalid pixel symbol.`)
            return
        }
        for (let x = 0; x < row.length; x++) {
            const packed = f4.buffer[
                8 + x * f4.columnStride + (y >> 1)
            ]
            const expected = y % 2 === 0 ?
                packed & 0x0f : (packed >> 4) & 0x0f
            if (pixelValue(row[x].toLowerCase()) !== expected) {
                report(
                    `[${key}] generated binding pixel (${x},${y}) does not match images.g.jres; ` +
                    "regenerate images.g.ts with MakeCode's emitter."
                )
                return
            }
        }
    }
}

function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"))
    } catch (error) {
        console.error(`Could not parse ${path.basename(filePath)}: ${error.message}`)
        process.exit(1)
    }
}

if (!fs.existsSync(jresPath) || !fs.existsSync(bindingsPath)) {
    console.error("Run this command from a complete MakeCode Racing checkout.")
    process.exit(1)
}

const jres = readJson(jresPath)
const entries = Object.entries(jres).filter(([key]) => key !== "*")
const ids = []
const displayNames = []
const assets = []
const expectedBindingNames = new Set()

for (const [key, entry] of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        report(`[${key}] is not a JRES asset object.`)
        continue
    }
    if (typeof entry.id !== "string" || entry.id.length === 0) {
        report(`[${key}] is missing an id.`)
    } else {
        ids.push(entry.id)
        expectedBindingNames.add(localAssetId(entry.id))
        if (entry.id !== key) {
            report(`[${key}] id is ${entry.id}; the object key and id must match.`)
        }
    }
    if (typeof entry.displayName !== "string" || entry.displayName.length === 0) {
        report(`[${key}] is missing a displayName.`)
    } else {
        displayNames.push(entry.displayName)
        expectedBindingNames.add(entry.displayName)
    }

    const f4 = decodeF4(entry, key)
    if (f4) {
        assets.push({ key, entry, f4 })
    }
}

for (const duplicate of findDuplicates(ids)) {
    report(`Duplicate JRES id: ${duplicate}`)
}
for (const duplicate of findDuplicates(displayNames)) {
    report(`Duplicate JRES displayName: ${duplicate}`)
}

const generatedSource = fs.readFileSync(bindingsPath, "utf8")
const bindings = parseGeneratedBindings(generatedSource)
const bindingsByName = new Map()
for (const binding of bindings) {
    if (binding.names.length === 0) {
        report("images.g.ts contains an image binding without a case name.")
    }
    for (const name of binding.names) {
        const namedBindings = bindingsByName.get(name) || []
        namedBindings.push(binding)
        bindingsByName.set(name, namedBindings)
    }
}

for (const asset of assets) {
    const idName = localAssetId(asset.entry.id)
    const displayName = asset.entry.displayName

    const idBindings = bindingsByName.get(idName) || []
    const displayBindings = bindingsByName.get(displayName) || []
    if (idBindings.length === 0) {
        report(`[${asset.key}] images.g.ts is missing id binding "${idName}".`)
        continue
    }
    if (displayBindings.length === 0) {
        report(`[${asset.key}] images.g.ts is missing displayName binding "${displayName}".`)
        continue
    }
    if (idBindings.length > 1) {
        report(`[${asset.key}] images.g.ts binds id "${idName}" more than once.`)
        continue
    }
    if (displayBindings.length > 1) {
        report(`[${asset.key}] images.g.ts binds displayName "${displayName}" more than once.`)
        continue
    }
    if (idBindings[0] !== displayBindings[0]) {
        report(
            `[${asset.key}] id "${idName}" and displayName "${displayName}" ` +
            "resolve to different generated images."
        )
        continue
    }
    validateBindingPixels(asset, idBindings[0])
}

for (const name of bindingsByName.keys()) {
    if (!expectedBindingNames.has(name)) {
        report(`images.g.ts contains stale or unknown image binding "${name}".`)
    }
}
if (bindings.length !== entries.length) {
    report(
        `images.g.ts contains ${bindings.length} image bodies, while ` +
        `images.g.jres contains ${entries.length} assets.`
    )
}

if (errors.length > 0) {
    console.error(`Asset validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`)
    for (const error of errors) {
        console.error(`- ${error}`)
    }
    process.exit(1)
}

const dimensionCounts = new Map()
for (const asset of assets) {
    const dimensions = `${asset.f4.width}x${asset.f4.height}`
    dimensionCounts.set(dimensions, (dimensionCounts.get(dimensions) || 0) + 1)
}
const dimensionSummary = [...dimensionCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([dimensions, count]) => `${dimensions} (${count})`)
    .join(", ")

console.log(
    `Validated ${assets.length} MakeCode F4 assets and ${bindings.length} generated bindings.`
)
console.log(`Dimensions: ${dimensionSummary}`)
