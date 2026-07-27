import fs from "fs"
import path from "path"
import vm from "vm"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
const sharp = require("sharp")

const projectRoot = process.cwd()
const sourceFiles = [
    "garage_art.ts",
    "garage_main_background.ts",
    "garage_engine_brakes_backgrounds.ts",
    "garage_wheels_body_backgrounds.ts"
]
const outputDirectory = path.join(projectRoot, "garage-background-previews")

const palette = {
    0: [0, 0, 0, 0],
    1: [255, 255, 255, 255],
    10: [142, 46, 196, 255],
    11: [164, 131, 159, 255],
    12: [92, 64, 108, 255],
    15: [0, 0, 0, 255]
}
const approvedColors = new Set([1, 10, 11, 12, 15])

class PixelImage {
    constructor(width, height) {
        this.width = width
        this.height = height
        this.pixels = new Uint8Array(width * height)
    }

    fill(color) {
        this.pixels.fill(color)
    }

    setPixel(x, y, color) {
        x = Math.trunc(x)
        y = Math.trunc(y)
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.pixels[y * this.width + x] = color
        }
    }

    fillRect(x, y, width, height, color) {
        for (let py = y; py < y + height; py++) {
            for (let px = x; px < x + width; px++) {
                this.setPixel(px, py, color)
            }
        }
    }

    drawLine(x0, y0, x1, y1, color) {
        x0 = Math.trunc(x0)
        y0 = Math.trunc(y0)
        x1 = Math.trunc(x1)
        y1 = Math.trunc(y1)
        const dx = Math.abs(x1 - x0)
        const sx = x0 < x1 ? 1 : -1
        const dy = -Math.abs(y1 - y0)
        const sy = y0 < y1 ? 1 : -1
        let error = dx + dy
        while (true) {
            this.setPixel(x0, y0, color)
            if (x0 === x1 && y0 === y1) break
            const twiceError = error * 2
            if (twiceError >= dy) {
                error += dy
                x0 += sx
            }
            if (twiceError <= dx) {
                error += dx
                y0 += sy
            }
        }
    }

    drawRect(x, y, width, height, color) {
        this.drawLine(x, y, x + width - 1, y, color)
        this.drawLine(x, y + height - 1, x + width - 1, y + height - 1, color)
        this.drawLine(x, y, x, y + height - 1, color)
        this.drawLine(x + width - 1, y, x + width - 1, y + height - 1, color)
    }

    fillTriangle(x0, y0, x1, y1, x2, y2, color) {
        const minimumX = Math.floor(Math.min(x0, x1, x2))
        const maximumX = Math.ceil(Math.max(x0, x1, x2))
        const minimumY = Math.floor(Math.min(y0, y1, y2))
        const maximumY = Math.ceil(Math.max(y0, y1, y2))
        const edge = (ax, ay, bx, by, px, py) =>
            (px - ax) * (by - ay) - (py - ay) * (bx - ax)
        const winding = edge(x0, y0, x1, y1, x2, y2)

        for (let y = minimumY; y <= maximumY; y++) {
            for (let x = minimumX; x <= maximumX; x++) {
                const first = edge(x0, y0, x1, y1, x, y)
                const second = edge(x1, y1, x2, y2, x, y)
                const third = edge(x2, y2, x0, y0, x, y)
                if (
                    (winding >= 0 && first >= 0 && second >= 0 && third >= 0) ||
                    (winding < 0 && first <= 0 && second <= 0 && third <= 0)
                ) {
                    this.setPixel(x, y, color)
                }
            }
        }
    }
}

function makePreviewJavaScript(fileName) {
    const source = fs.readFileSync(path.join(projectRoot, fileName), "utf8")
    const namespaceStart = source.indexOf("namespace GarageBackgroundArt")
    const openingBrace = source.indexOf("{", namespaceStart)
    const closingBrace = source.lastIndexOf("}")
    if (namespaceStart < 0 || openingBrace < 0 || closingBrace < openingBrace) {
        throw new Error(`Could not unwrap GarageBackgroundArt in ${fileName}`)
    }

    return source
        .slice(openingBrace + 1, closingBrace)
        .replace(/\bGarageBackgroundArt\./g, "")
        .replace(/\bexport\s+/g, "")
        .replace(/:\s*(Image|number|boolean|string)\b/g, "")
}

const context = vm.createContext({
    image: { create: (width, height) => new PixelImage(width, height) },
    Math: Object.assign(Object.create(Math), {
        idiv: (left, right) => Math.trunc(left / right)
    })
})
const combinedSource = sourceFiles.map(makePreviewJavaScript).join("\n")
vm.runInContext(combinedSource, context, { filename: "garage-background-preview.js" })

fs.mkdirSync(outputDirectory, { recursive: true })

const rendered = {}
for (const name of ["main", "engine", "wheels", "body", "brakes"]) {
    const art = vm.runInContext(`${name}()`, context)
    if (art.width !== 160 || art.height !== 120) {
        throw new Error(`${name}: expected 160x120, got ${art.width}x${art.height}`)
    }

    const colors = new Set(art.pixels)
    for (const color of colors) {
        if (!approvedColors.has(color)) {
            throw new Error(`${name}: unapproved MakeCode color index ${color}`)
        }
    }

    const rgba = Buffer.alloc(art.width * art.height * 4)
    for (let i = 0; i < art.pixels.length; i++) {
        const color = palette[art.pixels[i]]
        rgba[i * 4] = color[0]
        rgba[i * 4 + 1] = color[1]
        rgba[i * 4 + 2] = color[2]
        rgba[i * 4 + 3] = color[3]
    }

    const outputPath = path.join(outputDirectory, `garage-${name}-background.png`)
    await sharp(rgba, { raw: { width: art.width, height: art.height, channels: 4 } })
        .png()
        .toFile(outputPath)
    rendered[name] = art
}

function sideStrip(art) {
    const pixels = []
    for (let y = 18; y <= 82; y++) {
        for (let x = 0; x <= 15; x++) pixels.push(art.pixels[y * art.width + x])
        for (let x = 144; x < 160; x++) pixels.push(art.pixels[y * art.width + x])
    }
    return Buffer.from(pixels)
}

const hardwareReference = sideStrip(rendered.engine)
for (const name of ["wheels", "body", "brakes"]) {
    if (!hardwareReference.equals(sideStrip(rendered[name]))) {
        throw new Error(`${name}: nuts-and-bolts side pattern differs from engine`)
    }
}

function imageLiteral(art) {
    const symbols = ".123456789abcdef"
    const rows = []
    for (let y = 0; y < art.height; y++) {
        let row = ""
        for (let x = 0; x < art.width; x++) {
            row += symbols[art.pixels[y * art.width + x]]
        }
        rows.push(row)
    }
    return rows.join("\n")
}

function encodeF4(art) {
    const output = Buffer.alloc(8 + Math.ceil(art.pixels.length / 2))
    output[0] = 0x87
    output[1] = 0x04
    output.writeUInt16LE(art.width, 2)
    output.writeUInt16LE(art.height, 4)
    for (let pixel = 0; pixel < art.pixels.length; pixel += 2) {
        output[8 + (pixel >> 1)] =
            art.pixels[pixel] | ((art.pixels[pixel + 1] || 0) << 4)
    }
    return output.toString("base64")
}

const assetNames = ["main", "engine", "wheels", "body", "brakes"]
const imageCases = assetNames.map((name, index) => {
    const displayName = `garage-${name}-background`
    return [
        `            case "image${index + 1}":`,
        `            case "${displayName}":return img\``,
        imageLiteral(rendered[name]),
        "            `"
    ].join("\n")
}).join("\n")

const generatedTypeScript = [
    "// Auto-generated code. Do not edit.",
    "namespace myImages {",
    "",
    '    helpers._registerFactory("image", function(name: string) {',
    "        switch(helpers.stringTrim(name)) {",
    imageCases,
    "        }",
    "        return null",
    "    })",
    "}",
    ""
].join("\n")

const generatedJres = {}
for (let index = 0; index < assetNames.length; index++) {
    const name = assetNames[index]
    const id = `myImages.image${index + 1}`
    generatedJres[id] = {
        id,
        data: encodeF4(rendered[name]),
        dataEncoding: "base64",
        namespace: "myImages.",
        mimeType: "image/x-mkcd-f4",
        displayName: `garage-${name}-background`
    }
}

fs.writeFileSync(path.join(projectRoot, "images.g.ts"), generatedTypeScript)
fs.writeFileSync(path.join(projectRoot, "images.g.jres"), JSON.stringify(generatedJres, null, 4) + "\n")

console.log("Rendered five 160x120 previews.")
console.log("Palette verified: 1, 10, 11, 12, 15 only.")
console.log("Shared hardware side pattern verified for engine, wheels, body, and brakes.")
console.log("Generated five named MakeCode assets in images.g.ts and images.g.jres.")
