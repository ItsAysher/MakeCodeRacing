import fs from "fs"
import path from "path"

const projectRoot = process.cwd()
const jresPath = path.join(projectRoot, "images.g.jres")

class PixelImage {
    constructor(width, height) {
        this.width = width
        this.height = height
        this.pixels = new Uint8Array(width * height)
    }

    setPixel(x, y, color) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.pixels[y * this.width + x] = color
        }
    }

    getPixel(x, y) {
        return this.pixels[y * this.width + x]
    }

    fillRect(x, y, width, height, color) {
        for (let row = y; row < y + height; row++) {
            for (let column = x; column < x + width; column++) {
                this.setPixel(column, row, color)
            }
        }
    }
}

function drawBaseCar(config) {
    const image = new PixelImage(24, 12)
    const leftEdges = [24, 4, 3, 2, 1, 0, 0, 1, 2, 3, 4, 24]
    const rightEdges = [-1, 19, 21, 22, 23, 23, 23, 23, 22, 21, 19, -1]

    for (let y = 1; y <= 10; y++) {
        for (let x = leftEdges[y]; x <= rightEdges[y]; x++) {
            image.setPixel(x, y, 15)
        }
    }
    for (let y = 2; y <= 9; y++) {
        for (let x = leftEdges[y] + 1; x <= rightEdges[y] - 1; x++) {
            image.setPixel(x, y, config.body)
        }
    }

    // Four tires remain visible around the silhouette.
    image.fillRect(4, 0, 4, 2, 15)
    image.fillRect(15, 0, 4, 2, 15)
    image.fillRect(4, 10, 4, 2, 15)
    image.fillRect(15, 10, 4, 2, 15)

    // Cabin and glass establish the direction without needing animation.
    image.fillRect(8, 3, 8, 6, config.shade)
    image.fillRect(10, 3, 5, 2, config.glass)
    image.fillRect(10, 7, 5, 2, config.glass)
    image.fillRect(16, 4, 3, 4, config.accent)
    image.setPixel(22, 5, 1)
    image.setPixel(22, 6, 1)
    image.setPixel(2, 4, 2)
    image.setPixel(2, 7, 2)

    if (config.style === "rack") {
        image.fillRect(9, 2, 1, 8, 14)
        image.fillRect(14, 2, 1, 8, 14)
        image.fillRect(10, 5, 4, 2, 5)
    } else if (config.style === "wedge") {
        image.setPixel(23, 3, 0)
        image.setPixel(23, 8, 0)
        image.setPixel(19, 4, 1)
        image.setPixel(20, 5, 1)
        image.setPixel(21, 6, 1)
        image.setPixel(20, 7, 1)
    } else if (config.style === "buggy") {
        image.setPixel(1, 4, 0)
        image.setPixel(1, 7, 0)
        image.fillRect(9, 2, 1, 8, config.accent)
        image.fillRect(14, 2, 1, 8, config.accent)
        image.setPixel(20, 3, 5)
        image.setPixel(20, 8, 5)
    } else if (config.style === "tuner") {
        image.fillRect(1, 1, 2, 10, config.accent)
        image.fillRect(6, 5, 14, 2, config.accent)
        image.setPixel(22, 4, 9)
        image.setPixel(22, 7, 9)
    } else if (config.style === "attack") {
        image.fillRect(0, 1, 2, 10, 1)
        image.fillRect(1, 2, 1, 8, config.accent)
        image.fillRect(5, 5, 17, 2, config.accent)
        image.setPixel(21, 4, 1)
        image.setPixel(21, 7, 1)
    } else if (config.style === "gt") {
        image.fillRect(5, 2, 2, 8, config.accent)
        image.fillRect(18, 3, 3, 6, config.accent)
        image.setPixel(22, 4, 5)
        image.setPixel(22, 7, 5)
    } else if (config.style === "stone-sprinter") {
        image.fillRect(7, 5, 13, 1, 1)
        image.setPixel(12, 4, 15)
        image.setPixel(13, 5, 15)
        image.setPixel(14, 6, 15)
    } else if (config.style === "stone-guardian") {
        image.fillRect(3, 3, 4, 6, config.shade)
        image.fillRect(17, 3, 4, 6, config.shade)
        image.setPixel(11, 5, 15)
        image.setPixel(12, 6, 15)
        image.setPixel(13, 7, 15)
    } else if (config.style === "stone-crown") {
        image.fillRect(2, 1, 2, 10, config.shade)
        image.setPixel(9, 2, 7)
        image.setPixel(14, 2, 7)
        image.setPixel(11, 5, 15)
        image.setPixel(12, 6, 15)
    }
    return image
}

function flipHorizontal(source) {
    const result = new PixelImage(source.width, source.height)
    for (let y = 0; y < source.height; y++) {
        for (let x = 0; x < source.width; x++) {
            result.setPixel(source.width - 1 - x, y, source.getPixel(x, y))
        }
    }
    return result
}

function rotateCounterClockwise(source) {
    const result = new PixelImage(source.height, source.width)
    for (let y = 0; y < source.height; y++) {
        for (let x = 0; x < source.width; x++) {
            result.setPixel(y, source.width - 1 - x, source.getPixel(x, y))
        }
    }
    return result
}

function rotateClockwise(source) {
    const result = new PixelImage(source.height, source.width)
    for (let y = 0; y < source.height; y++) {
        for (let x = 0; x < source.width; x++) {
            result.setPixel(source.height - 1 - y, x, source.getPixel(x, y))
        }
    }
    return result
}

function imageFromRows(rows) {
    const symbols = ".123456789abcdef"
    const width = rows[0].length
    const result = new PixelImage(width, rows.length)
    for (let y = 0; y < rows.length; y++) {
        if (rows[y].length !== width) {
            throw new Error(`Inconsistent row width at ${y}`)
        }
        for (let x = 0; x < width; x++) {
            const color = symbols.indexOf(rows[y][x])
            if (color < 0) throw new Error(`Unknown pixel ${rows[y][x]}`)
            result.setPixel(x, y, color)
        }
    }
    return result
}

function encodeF4(image) {
    // MakeCode's F4 payload stores each column independently. Two vertical
    // pixels share a byte and every column is padded to a four-byte boundary.
    // Keeping this layout exact matters: a tightly packed row-major payload
    // can have a valid-looking header while the MakeCode emitter decodes it as
    // scrambled art.
    const columnStride = (Math.ceil(image.height / 2) + 3) & ~3
    const output = Buffer.alloc(8 + image.width * columnStride)
    output[0] = 0x87
    output[1] = 0x04
    output.writeUInt16LE(image.width, 2)
    output.writeUInt16LE(image.height, 4)
    for (let x = 0; x < image.width; x++) {
        for (let y = 0; y < image.height; y++) {
            const byteIndex = 8 + x * columnStride + (y >> 1)
            const color = image.getPixel(x, y)
            if (y & 1) {
                output[byteIndex] |= color << 4
            } else {
                output[byteIndex] |= color
            }
        }
    }
    return output.toString("base64")
}

const assets = []
function addAsset(displayName, image) {
    assets.push({ displayName, image })
}

const vehicles = [
    ["forest-bramble", { body: 7, shade: 6, glass: 9, accent: 5, style: "rack" }],
    ["forest-ember", { body: 4, shade: 2, glass: 9, accent: 1, style: "wedge" }],
    ["forest-phantom", { body: 12, shade: 15, glass: 11, accent: 5, style: "buggy" }],
    ["highway-neon", { body: 6, shade: 9, glass: 15, accent: 3, style: "tuner" }],
    ["highway-apex", { body: 1, shade: 13, glass: 9, accent: 2, style: "attack" }],
    ["highway-goldline", { body: 15, shade: 12, glass: 9, accent: 5, style: "gt" }]
]

for (const [name, config] of vehicles) {
    const right = drawBaseCar(config)
    addAsset(`${name}-right`, right)
    addAsset(`${name}-left`, flipHorizontal(right))
    addAsset(`${name}-up`, rotateCounterClockwise(right))
    addAsset(`${name}-down`, rotateClockwise(right))
}

const stoneVehicles = [
    ["cave-stone-sprinter", "stone-sprinter"],
    ["cave-stone-guardian", "stone-guardian"],
    ["cave-stone-crown", "stone-crown"]
]
for (const [name, style] of stoneVehicles) {
    addAsset(`${name}-right`, drawBaseCar({
        body: 13,
        shade: 12,
        glass: 15,
        accent: 1,
        style
    }))
}

addAsset("cave-racer-pedestal", imageFromRows([
    "........................",
    "........................",
    "........................",
    "........................",
    "....cccccccccccccccc....",
    "...cddddddddddddddddc...",
    "..cddddccccccccddddddc..",
    ".cddddddddddddddddddddc.",
    "ffffffffffffffffffffffff"
]))

addAsset("cave-home-altar", imageFromRows([
    "..........9999..........",
    ".........991199.........",
    "........99999999........",
    "..........9999..........",
    "....cccccccccccccccc....",
    "...cddddddddddddddddc...",
    "..cddddccccccccddddddc..",
    ".cddddddddddddddddddddc.",
    "ffffffffffffffffffffffff"
]))

addAsset("ability-boost-icon", imageFromRows([
    "..55....",
    ".555....",
    "555555..",
    "..55555.",
    "....55..",
    "...55...",
    "..55....",
    "........"
]))
addAsset("ability-blink-icon", imageFromRows([
    "...99...",
    ".991199.",
    "99.11.99",
    "...11...",
    "...11...",
    "99.11.99",
    ".991199.",
    "...99..."
]))
addAsset("ability-drift-icon", imageFromRows([
    "........",
    ".1111...",
    "11..11..",
    "....11..",
    "...11...",
    "..11....",
    ".11..55.",
    ".....55."
]))
addAsset("ability-lock-icon", imageFromRows([
    "..cccc..",
    ".cc..cc.",
    ".cc..cc.",
    "cccccccc",
    "cc.c..cc",
    "cc.c..cc",
    "cc....cc",
    "cccccccc"
]))
addAsset("champion-trophy-icon", imageFromRows([
    ".555555.",
    "55555555",
    "55.55.55",
    ".555555.",
    "..5555..",
    "...55...",
    "..5555..",
    ".ffffff."
]))

const jres = JSON.parse(fs.readFileSync(jresPath, "utf8"))
const existingProperties = Object.entries(jres)
let maximumImageId = 0
const replacementIds = new Map()
for (const [key, value] of existingProperties) {
    const match = /myImages\.image(\d+)/.exec(key)
    if (match) maximumImageId = Math.max(maximumImageId, Number(match[1]))
    if (assets.some(asset => asset.displayName === value.displayName)) {
        replacementIds.set(value.displayName, key)
        delete jres[key]
    }
}

for (const asset of assets) {
    let id = replacementIds.get(asset.displayName)
    if (!id) {
        maximumImageId += 1
        id = `myImages.image${maximumImageId}`
    }
    jres[id] = {
        id,
        data: encodeF4(asset.image),
        dataEncoding: "base64",
        namespace: "myImages.",
        mimeType: "image/x-mkcd-f4",
        displayName: asset.displayName
    }
}

fs.writeFileSync(jresPath, JSON.stringify(jres, null, 4) + "\n")
console.log(`Preserved ${existingProperties.length - replacementIds.size} existing entries.`)
console.log(`Generated or updated ${assets.length} native MakeCode F4 assets.`)
