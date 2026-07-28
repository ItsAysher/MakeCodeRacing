import fs from "fs"
import path from "path"

const projectRoot = process.cwd()
const mapSize = 32

const tileDefinitions = [
    {
        displayName: "forestTrail",
        rows: [
            "eeeeeeeeeeeeeeee",
            "eeeeeeeeeeeeeeee",
            "eeeeedeeeeeeeeee",
            "eeeeeeeeeeeeeeee",
            "eeedeeeeeeeeeeee",
            "eeeeeeeeeedeeeee",
            "eeeeeeeeeeeeeeee",
            "eeeeeedeeeeeeeee",
            "eeeeeeeeeeeeeeee",
            "eeeeeeeeeeeedeee",
            "eedeeeeeeeeeeeee",
            "eeeeeeeeeeeeeeee",
            "eeeeeeedeeeeeeee",
            "eeeeeeeeeeeeeeee",
            "eeeeeeeeedeeeeee",
            "eeeeeeeeeeeeeeee"
        ]
    },
    {
        displayName: "forestTree",
        rows: [
            "7777777777777777",
            "7777776666777777",
            "7777666666677777",
            "7776666766667777",
            "7766666666666777",
            "7666676666666677",
            "7666666666766677",
            "7766667666666777",
            "7776666666667777",
            "7777666666677777",
            "77777eeef7777777",
            "77777eeef7777777",
            "77777eeef7777777",
            "77777eeef7777777",
            "7777777777777777",
            "7777777777777777"
        ]
    },
    {
        displayName: "forestRock",
        rows: [
            "7777777777777777",
            "7777777777777777",
            "7777777777777777",
            "777777cccc777777",
            "77777cddddc77777",
            "7777cddddddc7777",
            "777cddddddddc777",
            "777cdddddccdc777",
            "777cddddddddc777",
            "7777cddddddc7777",
            "77777cccccc77777",
            "7777777777777777",
            "7777777777777777",
            "7777777777777777",
            "7777777777777777",
            "7777777777777777"
        ]
    },
    {
        displayName: "forestFlowers",
        rows: [
            "................",
            "................",
            "...5............",
            "..525...........",
            "...5............",
            "...7............",
            "..........3.....",
            ".........323....",
            "..........3.....",
            "..........7.....",
            "................",
            ".....1..........",
            "....151.........",
            ".....1..........",
            ".....7..........",
            "................"
        ]
    },
    {
        displayName: "highwayAsphalt",
        rows: [
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc"
        ]
    },
    {
        displayName: "highwayIntersection",
        rows: [
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "55cccccccccc55cc",
            "55cccccccccc55cc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "55cccccccccc55cc",
            "55cccccccccc55cc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc"
        ]
    },
    {
        displayName: "highwayShoulder",
        rows: [
            "dddddddddddddddd",
            "dddddddddddddddd",
            "dddddddddddddddd",
            "eeeeeeeeeeeeeeee",
            "dddddddddddddddd",
            "dddddddddddddddd",
            "dddddddddddddddd",
            "eeeeeeeeeeeeeeee",
            "dddddddddddddddd",
            "dddddddddddddddd",
            "dddddddddddddddd",
            "eeeeeeeeeeeeeeee",
            "dddddddddddddddd",
            "dddddddddddddddd",
            "dddddddddddddddd",
            "eeeeeeeeeeeeeeee"
        ]
    },
    {
        displayName: "highwayBarrier",
        rows: [
            "dddddddddddddddd",
            "dddddddddddddddd",
            "dddddddddddddddd",
            "1111222211112222",
            "1111222211112222",
            "ffffffffffffffff",
            "dddddddddddddddd",
            "dddddddddddddddd",
            "dddddddddddddddd",
            "1111222211112222",
            "1111222211112222",
            "ffffffffffffffff",
            "dddddddddddddddd",
            "dddddddddddddddd",
            "dddddddddddddddd",
            "dddddddddddddddd"
        ]
    },
    {
        displayName: "highwayCrack",
        rows: [
            "................",
            "................",
            "................",
            "..........f.....",
            ".........f......",
            "......f.f.......",
            ".......f........",
            "......f.........",
            "....ff..........",
            "...f............",
            "...f............",
            "................",
            "................",
            "................",
            "................",
            "................"
        ]
    },
    {
        displayName: "highwayCone",
        rows: [
            "................",
            "................",
            "................",
            ".......4........",
            "......444.......",
            "......414.......",
            ".....44444......",
            ".....41114......",
            "....4444444.....",
            "....4111114.....",
            "...444444444....",
            "..fffffffffff...",
            "..fffffffffff...",
            "................",
            "................",
            "................"
        ]
    },
    {
        displayName: "caveWall",
        rows: [
            "ffffffffffffffff",
            "fccccccccccccccf",
            "fcddddccccddddcf",
            "fcddddccccddddcf",
            "fccccccccccccccf",
            "fcccaaaaccccaaaf",
            "fcccaaaaccccaaaf",
            "fccccccccccccccf",
            "fcddddccccddddcf",
            "fcddddccccddddcf",
            "fccccccccccccccf",
            "faaaaccccaaaaccf",
            "faaaaccccaaaaccf",
            "fccccccccccccccf",
            "fccccccccccccccf",
            "ffffffffffffffff"
        ]
    },
    {
        displayName: "caveCrystal",
        rows: [
            "................",
            "........9.......",
            ".......999......",
            "......99199.....",
            "......99999.....",
            ".......999......",
            ".......899......",
            "....9..899......",
            "...999.888..9...",
            "..99199888.999..",
            "..999998889919..",
            "...9998888999...",
            "....88888889....",
            "...fffffffff....",
            "................",
            "................"
        ]
    },
    {
        displayName: "caveRubble",
        rows: [
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccdcccccccccccc",
            "ccdddcccccddcccc",
            "cddddccccddddccc",
            "ccdddcccccdddccc",
            "cccccccccccccccc",
            "ccccccddcccccccc",
            "cccccddddccccccc",
            "ccccccddcccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc",
            "cccccccccccccccc"
        ]
    },
    {
        displayName: "caveMoss",
        rows: [
            "................",
            "................",
            "...6............",
            "..676...........",
            "...67...........",
            "....6...........",
            ".........6......",
            "........676.....",
            ".........67.....",
            "..........6.....",
            "................",
            ".....6..........",
            "....676.........",
            ".....67.........",
            "................",
            "................"
        ]
    }
]

function pixelsFromRows(rows) {
    if (rows.length !== 16 || rows.some(row => row.length !== 16)) {
        throw new Error("Every custom tile must be exactly 16x16.")
    }

    const symbols = ".123456789abcdef"
    const pixels = []
    for (const row of rows) {
        for (const symbol of row) {
            const color = symbols.indexOf(symbol)
            if (color < 0) throw new Error(`Unknown pixel symbol: ${symbol}`)
            pixels.push(color)
        }
    }
    return pixels
}

function encodeF4(rows) {
    const pixels = pixelsFromRows(rows)
    const output = Buffer.alloc(8 + Math.ceil(pixels.length / 2))
    output[0] = 0x87
    output[1] = 0x04
    output.writeUInt16LE(16, 2)
    output.writeUInt16LE(16, 4)
    for (let pixel = 0; pixel < pixels.length; pixel += 2) {
        output[8 + (pixel >> 1)] =
            pixels[pixel] | ((pixels[pixel + 1] || 0) << 4)
    }
    return output.toString("base64")
}

function emptyMap(fillIndex) {
    return {
        tiles: Array(mapSize * mapSize).fill(fillIndex),
        walls: Array(mapSize * mapSize).fill(false)
    }
}

function setMapTile(map, column, row, tileIndex, wall = false) {
    if (column < 0 || column >= mapSize || row < 0 || row >= mapSize) return
    const offset = column + row * mapSize
    map.tiles[offset] = tileIndex
    map.walls[offset] = wall
}

function createForestMap() {
    const map = emptyMap(1)

    // A wide cross and a rectangular scenic loop connect cleanly on every edge.
    for (let row = 0; row < mapSize; row++) {
        for (let column = 0; column < mapSize; column++) {
            const centralRoad =
                (column >= 14 && column <= 17) ||
                (row >= 14 && row <= 17)
            const loopRoad =
                ((column >= 5 && column <= 7) && row >= 5 && row <= 26) ||
                ((column >= 24 && column <= 26) && row >= 5 && row <= 26) ||
                ((row >= 5 && row <= 7) && column >= 5 && column <= 26) ||
                ((row >= 24 && row <= 26) && column >= 5 && column <= 26)
            if (centralRoad || loopRoad) setMapTile(map, column, row, 2)
        }
    }
    return map
}

function createHighwayMap() {
    const map = emptyMap(1)

    for (let row = 0; row < mapSize; row++) {
        for (let column = 0; column < mapSize; column++) {
            const verticalRoad = column >= 13 && column <= 18
            const horizontalRoad = row >= 13 && row <= 18
            const verticalShoulder = (column === 12 || column === 19) && !horizontalRoad
            const horizontalShoulder = (row === 12 || row === 19) && !verticalRoad

            if (verticalRoad && horizontalRoad) {
                setMapTile(map, column, row, 4)
            } else if (verticalRoad) {
                setMapTile(map, column, row, column === 15 ? 2 : 5)
            } else if (horizontalRoad) {
                setMapTile(map, column, row, row === 15 ? 3 : 5)
            } else if (verticalShoulder || horizontalShoulder) {
                setMapTile(map, column, row, 6)
            }
        }
    }
    return map
}

function createCaveMap() {
    const map = emptyMap(3)

    for (let row = 0; row < mapSize; row++) {
        for (let column = 0; column < mapSize; column++) {
            const centerX = column - 15.5
            const centerY = row - 15.5
            const centralChamber =
                (centerX * centerX) / 105 + (centerY * centerY) / 72 < 1
            const westChamber =
                ((column - 8) * (column - 8)) / 30 +
                ((row - 9) * (row - 9)) / 22 < 1
            const eastChamber =
                ((column - 24) * (column - 24)) / 25 +
                ((row - 23) * (row - 23)) / 28 < 1
            const horizontalTunnel = row >= 14 && row <= 17
            const verticalTunnel = column >= 14 && column <= 17
            const open = centralChamber || westChamber || eastChamber ||
                horizontalTunnel || verticalTunnel

            if (open) {
                const floorIndex = (column + row) % 7 === 0 ? 2 : 1
                setMapTile(map, column, row, floorIndex)
            } else {
                setMapTile(map, column, row, 3, true)
            }
        }
    }
    return map
}

const mapDefinitions = [
    {
        id: "freeRoamForestMap",
        displayName: "freeRoamForestMap",
        tileset: [],
        map: createForestMap()
    },
    {
        id: "freeRoamHighwayMap",
        displayName: "freeRoamHighwayMap",
        tileset: [],
        map: createHighwayMap()
    },
    {
        id: "freeRoamCaveMap",
        displayName: "freeRoamCaveMap",
        tileset: [],
        map: createCaveMap()
    }
]

function validateMap(definition) {
    const map = definition.map
    const start = 16 + 16 * mapSize
    if (map.walls[start]) {
        throw new Error(`${definition.displayName} has a blocked center spawn.`)
    }

    const requiredEdgeOpenings = [
        15,
        16,
        15 + (mapSize - 1) * mapSize,
        16 + (mapSize - 1) * mapSize,
        15 * mapSize,
        16 * mapSize,
        mapSize - 1 + 15 * mapSize,
        mapSize - 1 + 16 * mapSize
    ]
    if (requiredEdgeOpenings.some(offset => map.walls[offset])) {
        throw new Error(`${definition.displayName} does not connect across every edge.`)
    }

    const visited = new Set([start])
    const pending = [start]
    while (pending.length) {
        const offset = pending.shift()
        const column = offset % mapSize
        const row = Math.floor(offset / mapSize)
        const neighbors = [
            [column - 1, row],
            [column + 1, row],
            [column, row - 1],
            [column, row + 1]
        ]
        for (const [nextColumn, nextRow] of neighbors) {
            if (
                nextColumn < 0 || nextColumn >= mapSize ||
                nextRow < 0 || nextRow >= mapSize
            ) {
                continue
            }
            const nextOffset = nextColumn + nextRow * mapSize
            if (!map.walls[nextOffset] && !visited.has(nextOffset)) {
                visited.add(nextOffset)
                pending.push(nextOffset)
            }
        }
    }

    const openTileCount = map.walls.filter(wall => !wall).length
    if (visited.size !== openTileCount) {
        throw new Error(`${definition.displayName} contains unreachable open terrain.`)
    }
    return {
        openTileCount,
        wallTileCount: mapSize * mapSize - openTileCount
    }
}

const mapValidation = mapDefinitions.map(definition => ({
    name: definition.displayName,
    ...validateMap(definition)
}))

function byteHex(value) {
    return value.toString(16).padStart(2, "0")
}

function uint16Hex(value) {
    return byteHex(value & 0xff) + byteHex((value >> 8) & 0xff)
}

function mapHex(map) {
    return uint16Hex(mapSize) + uint16Hex(mapSize) +
        map.tiles.map(byteHex).join("")
}

function wallCharacters(map) {
    return map.walls.map(wall => wall ? "2" : "0").join("")
}

function imageLiteral(rows) {
    return rows.map(row =>
        row.split("").map(symbol => symbol === "." ? "." : symbol).join(" ")
    ).join("\n")
}

function wallLiteral(map) {
    const rows = []
    for (let row = 0; row < mapSize; row++) {
        rows.push(map.walls
            .slice(row * mapSize, (row + 1) * mapSize)
            .map(wall => wall ? "2" : ".")
            .join(" "))
    }
    return rows.join("\n")
}

const jresPath = path.join(projectRoot, "tilemap.g.jres")
const jres = JSON.parse(fs.readFileSync(jresPath, "utf8"))

function suffixNumber(id, prefix) {
    const match = id.match(new RegExp(`^${prefix}(\\d+)$`))
    return match ? Number(match[1]) : 0
}

function nextResourceId(prefix) {
    let next = Math.max(0, ...Object.keys(jres).map(id => suffixNumber(id, prefix))) + 1
    while (jres[`${prefix}${next}`]) {
        next++
    }
    return `${prefix}${next}`
}

function findResourceId(displayName, mimeType) {
    const entry = Object.entries(jres).find(([, resource]) =>
        resource.displayName === displayName && resource.mimeType === mimeType
    )
    return entry ? entry[0] : undefined
}

const customTileIds = {}
for (const tile of tileDefinitions) {
    let id = findResourceId(tile.displayName, "image/x-mkcd-f4")
    if (!id || !/^myTiles\.tile\d+$/.test(id)) {
        id = nextResourceId("myTiles.tile")
    }
    customTileIds[tile.displayName] = id
    jres[id] = {
        id,
        data: encodeF4(tile.rows),
        dataEncoding: "base64",
        namespace: "myTiles.",
        mimeType: "image/x-mkcd-f4",
        tilemapTile: true,
        displayName: tile.displayName
    }
}

mapDefinitions[0].tileset = [
    "myTiles.transparency16",
    "sprites.castle.tileGrass1",
    customTileIds.forestTrail
]
mapDefinitions[1].tileset = [
    "myTiles.transparency16",
    "sprites.castle.tileDarkGrass1",
    "sprites.vehicle.roadVertical",
    "sprites.vehicle.roadHorizontal",
    customTileIds.highwayIntersection,
    customTileIds.highwayAsphalt,
    customTileIds.highwayShoulder
]
mapDefinitions[2].tileset = [
    "myTiles.transparency16",
    "sprites.dungeon.floorDark0",
    "sprites.dungeon.floorDark1",
    customTileIds.caveWall
]

for (const definition of mapDefinitions) {
    let id = findResourceId(definition.displayName, "application/mkcd-tilemap")
    if (!id || !/^level\d+$/.test(id)) {
        id = nextResourceId("level")
    }
    const serializedMap =
        "10" + mapHex(definition.map) + wallCharacters(definition.map)
    jres[id] = {
        id,
        data: Buffer.from(serializedMap, "utf8").toString("base64"),
        dataEncoding: "base64",
        namespace: "myTiles.",
        mimeType: "application/mkcd-tilemap",
        displayName: definition.displayName,
        tileset: definition.tileset
    }
}

function decodeF4(data) {
    const buffer = Buffer.from(data, "base64")
    const width = buffer.readUInt16LE(2)
    const height = buffer.readUInt16LE(4)
    const rows = []
    for (let y = 0; y < height; y++) {
        const row = []
        for (let x = 0; x < width; x++) {
            const packed = buffer[8 + Math.floor((y * width + x) / 2)]
            const color = (x + y * width) % 2 ? packed >> 4 : packed & 0x0f
            row.push(color ? color.toString(16) : ".")
        }
        rows.push(row.join(" "))
    }
    return rows.join("\n")
}

function decodeTilemap(resource) {
    const serialized = Buffer.from(resource.data, "base64").toString("utf8")
    if (serialized.slice(0, 2) !== "10") {
        throw new Error(`${resource.displayName} is missing its tilemap marker.`)
    }
    const mapData = serialized.slice(2)
    const width = parseInt(mapData.slice(2, 4) + mapData.slice(0, 2), 16)
    const height = parseInt(mapData.slice(6, 8) + mapData.slice(4, 6), 16)
    const tileDataLength = 8 + width * height * 2
    const wallData = mapData.slice(tileDataLength)
    if (wallData.length !== width * height) {
        throw new Error(`${resource.displayName} has invalid wall-layer dimensions.`)
    }
    const rows = []
    for (let y = 0; y < height; y++) {
        rows.push(wallData
            .slice(y * width, (y + 1) * width)
            .split("")
            .map(value => value === "0" ? "." : value)
            .join(" "))
    }
    return {
        tileHex: mapData.slice(0, tileDataLength),
        walls: rows.join("\n")
    }
}

const imageResources = Object.entries(jres).filter(([, resource]) =>
    resource.mimeType === "image/x-mkcd-f4"
)
const mapResources = Object.entries(jres).filter(([, resource]) =>
    resource.mimeType === "application/mkcd-tilemap"
)
const tileResources = imageResources.filter(([, resource]) => resource.tilemapTile)

const imageCases = imageResources.map(([id, resource]) => [
    `            case "${id}":`,
    resource.displayName ? `            case "${resource.displayName}":return img\`` : "            return img`",
    decodeF4(resource.data),
    "`;"
].join("\n")).join("\n")

const fixedTiles = tileResources.map(([id]) => [
    "    //% fixedInstance jres blockIdentity=images._tile",
    `    export const ${id.slice("myTiles.".length)} = image.ofBuffer(hex\`\`);`
].join("\n")).join("\n")

const mapCases = mapResources.map(([id, resource]) => {
    const decoded = decodeTilemap(resource)
    const shortId = id
    return [
        resource.displayName ? `            case "${resource.displayName}":` : "",
        `            case "${shortId}":return tiles.createTilemap(hex\`${decoded.tileHex}\`, img\``,
        decoded.walls,
        `\`, [${resource.tileset.join(",")}], TileScale.Sixteen);`
    ].filter(Boolean).join("\n")
}).join("\n")

const tileCases = tileResources.map(([id, resource]) => {
    const shortId = id.slice("myTiles.".length)
    return [
        resource.displayName ? `            case "${resource.displayName}":` : "",
        `            case "${shortId}":return myTiles.${shortId};`
    ].filter(Boolean).join("\n")
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
    '    helpers._registerFactory("animation", function(name: string) {',
    "        return null",
    "    })",
    '    helpers._registerFactory("song", function(name: string) {',
    "        return null",
    "    })",
    '    helpers._registerFactory("json", function(name: string) {',
    "        return null",
    "    })",
    "}",
    "",
    "namespace myTiles {",
    fixedTiles,
    "",
    '    helpers._registerFactory("tilemap", function(name: string) {',
    "        switch(helpers.stringTrim(name)) {",
    mapCases,
    "        }",
    "        return null;",
    "    })",
    "",
    '    helpers._registerFactory("tile", function(name: string) {',
    "        switch(helpers.stringTrim(name)) {",
    tileCases,
    "        }",
    "        return null;",
    "    })",
    "}",
    ""
].join("\n")

fs.writeFileSync(jresPath, JSON.stringify(jres, null, 4) + "\n")
fs.writeFileSync(path.join(projectRoot, "tilemap.g.ts"), generatedTypeScript)

console.log(`Merged ${tileDefinitions.length} custom tiles and ${mapDefinitions.length} 32x32 tilemaps into tilemap.g.*.`)
for (const result of mapValidation) {
    console.log(`${result.name}: ${result.openTileCount} open tiles, ${result.wallTileCount} wall tiles.`)
}
