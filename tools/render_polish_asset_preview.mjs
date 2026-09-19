import fs from "fs"
import path from "path"
import zlib from "zlib"

const root = process.cwd()
const jres = JSON.parse(fs.readFileSync(path.join(root, "images.g.jres"), "utf8"))
const prefixes = ["forest-", "highway-", "cave-", "ability-", "champion-"]
const palette = [
    "transparent", "#ffffff", "#ff2121", "#ff93c4",
    "#ff8135", "#fff609", "#249ca3", "#78dc52",
    "#003fad", "#87f2ff", "#8e2ec4", "#a4839f",
    "#5c406c", "#e5cdc4", "#91463d", "#000000"
]

function decodeF4(data) {
    const buffer = Buffer.from(data, "base64")
    if (buffer[0] !== 0x87 || buffer[1] !== 0x04) {
        throw new Error("Unsupported MakeCode image encoding")
    }
    const width = buffer.readUInt16LE(2)
    const height = buffer.readUInt16LE(4)
    const columnStride = (Math.ceil(height / 2) + 3) & ~3
    const expectedLength = 8 + width * columnStride
    if (buffer.length !== expectedLength) {
        throw new Error(`Invalid F4 payload length: expected ${expectedLength}, got ${buffer.length}`)
    }
    const pixels = new Array(width * height)
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const packed = buffer[8 + x * columnStride + (y >> 1)]
            pixels[y * width + x] = y & 1 ? packed >> 4 : packed & 0x0f
        }
    }
    return { width, height, pixels }
}

const assets = Object.values(jres)
    .filter(value => value && value.displayName &&
        prefixes.some(prefix => value.displayName.startsWith(prefix)))
    .map(value => ({ name: value.displayName, ...decodeF4(value.data) }))

const columns = 4
const cellWidth = 150
const cellHeight = 92
const scale = 4
const rows = Math.ceil(assets.length / columns)
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${columns * cellWidth}" height="${rows * cellHeight}" viewBox="0 0 ${columns * cellWidth} ${rows * cellHeight}">`
svg += `<rect width="100%" height="100%" fill="#201a2c"/>`
svg += `<style>text{font-family:monospace;font-size:11px;fill:#fff} .cell{fill:#34294a;stroke:#5c406c}</style>`

for (let index = 0; index < assets.length; index++) {
    const asset = assets[index]
    const cellX = (index % columns) * cellWidth
    const cellY = Math.floor(index / columns) * cellHeight
    const imageX = cellX + Math.floor((cellWidth - asset.width * scale) / 2)
    const imageY = cellY + 12
    svg += `<rect class="cell" x="${cellX + 2}" y="${cellY + 2}" width="${cellWidth - 4}" height="${cellHeight - 4}" rx="3"/>`
    for (let y = 0; y < asset.height; y++) {
        for (let x = 0; x < asset.width; x++) {
            const color = asset.pixels[y * asset.width + x]
            if (color !== 0) {
                svg += `<rect x="${imageX + x * scale}" y="${imageY + y * scale}" width="${scale}" height="${scale}" fill="${palette[color]}"/>`
            }
        }
    }
    svg += `<text x="${cellX + 8}" y="${cellY + cellHeight - 10}">${asset.name}</text>`
}

svg += "</svg>"
const outputDirectory = path.join(root, "built")
fs.mkdirSync(outputDirectory, { recursive: true })
const svgPath = path.join(outputDirectory, "polish-assets.svg")
fs.writeFileSync(svgPath, svg)

function crc32(buffer) {
    let crc = 0xffffffff
    for (const byte of buffer) {
        crc ^= byte
        for (let bit = 0; bit < 8; bit++) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
        }
    }
    return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
    const typeBuffer = Buffer.from(type, "ascii")
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const checksum = Buffer.alloc(4)
    checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
    return Buffer.concat([length, typeBuffer, data, checksum])
}

function writePng(filePath, width, height, rgba) {
    const header = Buffer.alloc(13)
    header.writeUInt32BE(width, 0)
    header.writeUInt32BE(height, 4)
    header[8] = 8
    header[9] = 6
    const scanlines = Buffer.alloc((width * 4 + 1) * height)
    for (let y = 0; y < height; y++) {
        const target = y * (width * 4 + 1)
        scanlines[target] = 0
        rgba.copy(scanlines, target + 1, y * width * 4, (y + 1) * width * 4)
    }
    fs.writeFileSync(filePath, Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk("IHDR", header),
        pngChunk("IDAT", zlib.deflateSync(scanlines)),
        pngChunk("IEND", Buffer.alloc(0))
    ]))
}

function parseHexColor(color) {
    if (color === "transparent") return [0, 0, 0, 0]
    return [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
        255
    ]
}

const previewWidth = columns * cellWidth
const previewHeight = rows * cellHeight
const rgba = Buffer.alloc(previewWidth * previewHeight * 4)
const background = parseHexColor("#201a2c")
const cellColor = parseHexColor("#34294a")
for (let offset = 0; offset < rgba.length; offset += 4) {
    rgba.set(background, offset)
}

function paintPixel(x, y, color) {
    if (x < 0 || x >= previewWidth || y < 0 || y >= previewHeight) return
    rgba.set(color, (y * previewWidth + x) * 4)
}

for (let index = 0; index < assets.length; index++) {
    const asset = assets[index]
    const cellX = (index % columns) * cellWidth
    const cellY = Math.floor(index / columns) * cellHeight
    for (let y = 3; y < cellHeight - 3; y++) {
        for (let x = 3; x < cellWidth - 3; x++) {
            paintPixel(cellX + x, cellY + y, cellColor)
        }
    }
    const imageX = cellX + Math.floor((cellWidth - asset.width * scale) / 2)
    const imageY = cellY + Math.floor((cellHeight - asset.height * scale) / 2)
    for (let y = 0; y < asset.height; y++) {
        for (let x = 0; x < asset.width; x++) {
            const paletteIndex = asset.pixels[y * asset.width + x]
            if (paletteIndex === 0) continue
            const color = parseHexColor(palette[paletteIndex])
            for (let scaledY = 0; scaledY < scale; scaledY++) {
                for (let scaledX = 0; scaledX < scale; scaledX++) {
                    paintPixel(
                        imageX + x * scale + scaledX,
                        imageY + y * scale + scaledY,
                        color
                    )
                }
            }
        }
    }
}

const pngPath = path.join(outputDirectory, "polish-assets.png")
writePng(pngPath, previewWidth, previewHeight, rgba)
console.log(svgPath)
console.log(pngPath)
