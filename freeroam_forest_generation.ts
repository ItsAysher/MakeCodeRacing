// Seamless procedural generation for Forest Free Roam

enum ForestSectionExit {
    North = 1,
    East = 2,
    South = 4,
    West = 8
}

enum ForestSectionBiome {
    Woodland,
    DenseForest,
    Clearing
}

// Runtime tile indices stay fixed so streamed sections can be overwritten
// without rebuilding their tileset or retaining old decoration overlays.
enum ForestMapTileIndex {
    Grass,
    GrassFlowers,
    GrassSparse,
    Trail,
    Tree,
    Rock,
    RiverWater,
    RiverSand,
    FlowersOnGrass,
    FlowersOnGrassFlowers,
    FlowersOnGrassSparse
}

let forestFreeRoamSpawnTile = freeRoamSectionSize + 4
let forestHomeRegionSectionRadius = 2
let forestHomeRegionSectionCount = 5
let forestHomeRegionTileSize =
    forestHomeRegionSectionCount * freeRoamSectionSize
let forestBaseMapHomeOffset = 4
let forestFreeRoamGenerationActive = false
let forestFreeRoamSeed = 0
let forestCenterWorldSectionX = 0
let forestCenterWorldSectionY = 0
let forestFreeRoamMap: tiles.TileMapData = null
let forestFreeRoamTileset: Image[] = []
let forestHomeTileIndices: number[] = []
let forestHomeWallFlags: boolean[] = []

/** Caches the forest ground, scenery, river, and composite flower tiles. */
function initializeForestFreeRoamTileset() {
    if (forestFreeRoamTileset.length > 0) {
        return
    }

    let grassTiles = [
        sprites.castle.tileGrass1,
        sprites.castle.tileGrass2,
        sprites.castle.tileGrass3
    ]

    for (let grassTile of grassTiles) {
        forestFreeRoamTileset.push(grassTile)
    }

    forestFreeRoamTileset.push(assets.tile`forestTrail`)
    forestFreeRoamTileset.push(assets.tile`forestTree`)
    forestFreeRoamTileset.push(assets.tile`forestRock`)

    forestFreeRoamTileset.push(assets.tile`forestRiverWater`)
    forestFreeRoamTileset.push(sprites.castle.tilePath5)

    // Flowers are composited once for each grass style. This gives stable
    // streamed decoration without tileUtil.coverTile state leaking on rebase.
    for (let grassTile of grassTiles) {
        let decoratedGrass = grassTile.clone()
        decoratedGrass.drawTransparentImage(assets.tile`forestFlowers`, 0, 0)
        forestFreeRoamTileset.push(decoratedGrass)
    }
}

/** Finds a runtime tile index while preserving future authored-map artwork. */
function forestRuntimeTileIndex(tileImage: Image) {
    for (let index = 0; index < forestFreeRoamTileset.length; index++) {
        if (forestFreeRoamTileset[index].equals(tileImage)) {
            return index
        }
    }

    forestFreeRoamTileset.push(tileImage)
    return forestFreeRoamTileset.length - 1
}

/** Writes a tile into the cached, aligned 40x40 authored home region. */
function setForestHomeTile(
    column: number,
    row: number,
    tileIndex: number,
    isWall: boolean
) {
    let arrayIndex = row * forestHomeRegionTileSize + column
    forestHomeTileIndices[arrayIndex] = tileIndex
    forestHomeWallFlags[arrayIndex] = isWall
}

/**
 * Centers the exact 32x32 authored map in a 40x40 region. Its four existing
 * trail sockets are extended through the four-tile alignment wrapper so the
 * first generated sections begin only beyond the definitive home map.
 */
function buildForestHomeRegion() {
    if (forestHomeTileIndices.length > 0) {
        return
    }

    let homeTileCount = forestHomeRegionTileSize * forestHomeRegionTileSize
    for (let index = 0; index < homeTileCount; index++) {
        forestHomeTileIndices.push(ForestMapTileIndex.Grass)
        forestHomeWallFlags.push(false)
    }

    let authoredForestMap = tilemap`freeRoamForestMap`
    for (let row = 0; row < authoredForestMap.height; row++) {
        for (let column = 0; column < authoredForestMap.width; column++) {
            let authoredTileIndex = authoredForestMap.getTile(column, row)
            setForestHomeTile(
                column + forestBaseMapHomeOffset,
                row + forestBaseMapHomeOffset,
                forestRuntimeTileIndex(
                    authoredForestMap.getTileImage(authoredTileIndex)
                ),
                authoredForestMap.isWall(column, row)
            )
        }
    }

    let socketStart = forestBaseMapHomeOffset + 14
    let socketEnd = forestBaseMapHomeOffset + 17
    let farWrapperStart =
        forestBaseMapHomeOffset + authoredForestMap.width

    for (let offset = 0; offset < forestBaseMapHomeOffset; offset++) {
        let farCoordinate = farWrapperStart + offset

        for (let socket = socketStart; socket <= socketEnd; socket++) {
            setForestHomeTile(
                offset, socket, ForestMapTileIndex.Trail, false
            )
            setForestHomeTile(
                farCoordinate, socket, ForestMapTileIndex.Trail, false
            )
            setForestHomeTile(
                socket, offset, ForestMapTileIndex.Trail, false
            )
            setForestHomeTile(
                socket, farCoordinate, ForestMapTileIndex.Trail, false
            )
        }
    }
}

function forestSectionIsInHomeRegion(
    worldSectionX: number,
    worldSectionY: number
) {
    return Math.abs(worldSectionX) <= forestHomeRegionSectionRadius &&
        Math.abs(worldSectionY) <= forestHomeRegionSectionRadius
}

function forestHomeArrayIndex(
    worldSectionX: number,
    worldSectionY: number,
    localColumn: number,
    localRow: number
) {
    let homeColumn =
        (worldSectionX + forestHomeRegionSectionRadius) *
        freeRoamSectionSize + localColumn
    let homeRow =
        (worldSectionY + forestHomeRegionSectionRadius) *
        freeRoamSectionSize + localRow
    return homeRow * forestHomeRegionTileSize + homeColumn
}

/** Chooses the deterministic route arrangement inside a 2x2 section block. */
function forestBlockUsesTurns(blockX: number, blockY: number) {
    return freeRoamCoordinateHash(
        forestFreeRoamSeed, blockX, blockY, 211
    ) % 2 == 0
}

function forestHorizontalEdgeBordersHome(leftX: number, y: number) {
    return (leftX == -forestHomeRegionSectionRadius - 1 ||
        leftX == forestHomeRegionSectionRadius) &&
        y >= -forestHomeRegionSectionRadius &&
        y <= forestHomeRegionSectionRadius
}

function forestVerticalEdgeBordersHome(x: number, topY: number) {
    return (topY == -forestHomeRegionSectionRadius - 1 ||
        topY == forestHomeRegionSectionRadius) &&
        x >= -forestHomeRegionSectionRadius &&
        x <= forestHomeRegionSectionRadius
}

function forestHorizontalEdgeRunsAlongHome(leftX: number, y: number) {
    return (y == -forestHomeRegionSectionRadius - 1 ||
        y == forestHomeRegionSectionRadius + 1) &&
        leftX >= -forestHomeRegionSectionRadius - 1 &&
        leftX <= forestHomeRegionSectionRadius
}

function forestVerticalEdgeRunsAlongHome(x: number, topY: number) {
    return (x == -forestHomeRegionSectionRadius - 1 ||
        x == forestHomeRegionSectionRadius + 1) &&
        topY >= -forestHomeRegionSectionRadius - 1 &&
        topY <= forestHomeRegionSectionRadius
}

/** Reciprocal west/east edge shared by both neighboring sections. */
function forestHorizontalSectionConnection(leftX: number, y: number) {
    // Only the authored map's centered sockets cross its outer edge.
    if (forestHorizontalEdgeBordersHome(leftX, y)) {
        return y == 0
    }
    if (forestHorizontalEdgeRunsAlongHome(leftX, y)) {
        return true
    }
    if (y == 0) {
        return true
    }

    let baseConnection = true
    if (freeRoamPositiveModulo(leftX, 2) == 0) {
        baseConnection = !forestBlockUsesTurns(
            Math.floor(leftX / 2),
            Math.floor(y / 2)
        )
    }

    if (baseConnection) {
        return true
    }

    return freeRoamCoordinateHash(
        forestFreeRoamSeed, leftX, y, 223
    ) % 100 < 24
}

/** Reciprocal north/south edge shared by both neighboring sections. */
function forestVerticalSectionConnection(x: number, topY: number) {
    if (forestVerticalEdgeBordersHome(x, topY)) {
        return x == 0
    }
    if (forestVerticalEdgeRunsAlongHome(x, topY)) {
        return true
    }
    if (x == 0) {
        return true
    }

    let baseConnection = false
    if (freeRoamPositiveModulo(topY, 2) == 0) {
        baseConnection = forestBlockUsesTurns(
            Math.floor(x / 2),
            Math.floor(topY / 2)
        )
    }

    if (baseConnection) {
        return true
    }

    return freeRoamCoordinateHash(
        forestFreeRoamSeed, x, topY, 227
    ) % 100 < 24
}

/** Builds the reciprocal N/E/S/W route mask for one generated section. */
function forestSectionExits(worldSectionX: number, worldSectionY: number) {
    let exits = 0

    if (forestVerticalSectionConnection(
        worldSectionX, worldSectionY - 1
    )) {
        exits |= ForestSectionExit.North
    }
    if (forestHorizontalSectionConnection(
        worldSectionX, worldSectionY
    )) {
        exits |= ForestSectionExit.East
    }
    if (forestVerticalSectionConnection(
        worldSectionX, worldSectionY
    )) {
        exits |= ForestSectionExit.South
    }
    if (forestHorizontalSectionConnection(
        worldSectionX - 1, worldSectionY
    )) {
        exits |= ForestSectionExit.West
    }

    return exits
}

/** A four-tile trail joins every open section edge through its center. */
function forestSectionHasTrail(
    exits: number,
    localColumn: number,
    localRow: number
) {
    if (localColumn < 0 || localColumn >= freeRoamSectionSize ||
        localRow < 0 || localRow >= freeRoamSectionSize) {
        return false
    }

    let inCenterColumns = localColumn >= 2 && localColumn <= 5
    let inCenterRows = localRow >= 2 && localRow <= 5

    if (inCenterColumns && inCenterRows) {
        return true
    }
    if ((exits & ForestSectionExit.North) &&
        inCenterColumns && localRow <= 1) {
        return true
    }
    if ((exits & ForestSectionExit.East) &&
        inCenterRows && localColumn >= 6) {
        return true
    }
    if ((exits & ForestSectionExit.South) &&
        inCenterColumns && localRow >= 6) {
        return true
    }
    if ((exits & ForestSectionExit.West) &&
        inCenterRows && localColumn <= 1) {
        return true
    }

    return false
}

/** Keeps solid scenery one tile away from every driveable trail. */
function forestSectionIsNearTrail(
    exits: number,
    localColumn: number,
    localRow: number
) {
    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let columnOffset = -1;
            columnOffset <= 1;
            columnOffset++) {
            if (forestSectionHasTrail(
                exits,
                localColumn + columnOffset,
                localRow + rowOffset
            )) {
                return true
            }
        }
    }

    return false
}

/** Selects a stable nature theme for one generated 8x8 section. */
function forestSectionBiome(
    worldSectionX: number,
    worldSectionY: number
) {
    let biomeRoll = freeRoamCoordinateHash(
        forestFreeRoamSeed,
        worldSectionX,
        worldSectionY,
        251
    ) % 100
    if (biomeRoll < 38) {
        return ForestSectionBiome.DenseForest
    } else if (biomeRoll < 70) {
        return ForestSectionBiome.Clearing
    }
    return ForestSectionBiome.Woodland
}

/** Selects the correct cached grass-and-flower composite. */
function forestFlowerTile(worldTileX: number, worldTileY: number) {
    return ForestMapTileIndex.FlowersOnGrass +
        freeRoamCoordinateHash(
            forestFreeRoamSeed, worldTileX, worldTileY, 257
        ) % 3
}

/** Recreates the original authored-map decoration rates deterministically. */
function forestHomeDecorationTile(
    sourceTileIndex: number,
    worldTileX: number,
    worldTileY: number
) {
    if (Math.abs(worldTileX - 4) <= 2 &&
        Math.abs(worldTileY - 4) <= 2) {
        return sourceTileIndex
    }

    let roll = freeRoamCoordinateHash(
        forestFreeRoamSeed, worldTileX, worldTileY, 263
    ) % 100
    if (roll < 4) {
        return ForestMapTileIndex.Tree
    } else if (roll < 7) {
        return ForestMapTileIndex.Rock
    } else if (roll < 17) {
        return ForestMapTileIndex.GrassFlowers
    } else if (roll < 26) {
        return ForestMapTileIndex.GrassSparse
    } else if (roll < 33) {
        return forestFlowerTile(worldTileX, worldTileY)
    }
    return sourceTileIndex
}

/** Returns stable scenery for an ordinary generated grass tile. */
function forestGeneratedGroundTile(
    biome: ForestSectionBiome,
    worldTileX: number,
    worldTileY: number,
    nearTrail: boolean
) {
    let roll = freeRoamCoordinateHash(
        forestFreeRoamSeed,
        worldTileX,
        worldTileY,
        271 + biome
    ) % 100

    if (biome == ForestSectionBiome.DenseForest) {
        if (!nearTrail && roll < 46) {
            return ForestMapTileIndex.Tree
        } else if (!nearTrail && roll < 54) {
            return ForestMapTileIndex.Rock
        } else if (roll < 65) {
            return ForestMapTileIndex.GrassFlowers
        } else if (roll < 75) {
            return ForestMapTileIndex.GrassSparse
        } else if (roll < 81) {
            return forestFlowerTile(worldTileX, worldTileY)
        }
    } else if (biome == ForestSectionBiome.Clearing) {
        if (!nearTrail && roll < 2) {
            return ForestMapTileIndex.Tree
        } else if (!nearTrail && roll < 4) {
            return ForestMapTileIndex.Rock
        } else if (roll < 24) {
            return ForestMapTileIndex.GrassFlowers
        } else if (roll < 40) {
            return ForestMapTileIndex.GrassSparse
        } else if (roll < 59) {
            return forestFlowerTile(worldTileX, worldTileY)
        }
    } else {
        if (!nearTrail && roll < 10) {
            return ForestMapTileIndex.Tree
        } else if (!nearTrail && roll < 15) {
            return ForestMapTileIndex.Rock
        } else if (roll < 28) {
            return ForestMapTileIndex.GrassFlowers
        } else if (roll < 40) {
            return ForestMapTileIndex.GrassSparse
        } else if (roll < 49) {
            return forestFlowerTile(worldTileX, worldTileY)
        }
    }

    return ForestMapTileIndex.Grass
}

/** Writes one authored or procedural section into the physical 3x3 window. */
function stampForestSection(
    map: tiles.TileMapData,
    physicalSectionX: number,
    physicalSectionY: number,
    worldSectionX: number,
    worldSectionY: number
) {
    let isHomeSection = forestSectionIsInHomeRegion(
        worldSectionX, worldSectionY
    )
    let exits = 0
    let biome = ForestSectionBiome.Woodland
    if (!isHomeSection) {
        exits = forestSectionExits(worldSectionX, worldSectionY)
        biome = forestSectionBiome(worldSectionX, worldSectionY)
    }

    for (let localRow = 0; localRow < freeRoamSectionSize; localRow++) {
        for (let localColumn = 0;
            localColumn < freeRoamSectionSize;
            localColumn++) {
            let mapColumn =
                physicalSectionX * freeRoamSectionSize + localColumn
            let mapRow =
                physicalSectionY * freeRoamSectionSize + localRow
            let worldTileX =
                worldSectionX * freeRoamSectionSize + localColumn
            let worldTileY =
                worldSectionY * freeRoamSectionSize + localRow
            let tileIndex = ForestMapTileIndex.Grass
            let isWall = false

            if (isHomeSection) {
                let homeIndex = forestHomeArrayIndex(
                    worldSectionX,
                    worldSectionY,
                    localColumn,
                    localRow
                )
                tileIndex = forestHomeTileIndices[homeIndex]
                isWall = forestHomeWallFlags[homeIndex]

                if (!isWall && tileIndex >= ForestMapTileIndex.Grass &&
                    tileIndex <= ForestMapTileIndex.GrassSparse) {
                    tileIndex = forestHomeDecorationTile(
                        tileIndex, worldTileX, worldTileY
                    )
                    isWall = tileIndex == ForestMapTileIndex.Tree ||
                        tileIndex == ForestMapTileIndex.Rock
                }
            } else if (forestSectionHasTrail(
                exits, localColumn, localRow
            )) {
                tileIndex = ForestMapTileIndex.Trail
            } else {
                tileIndex = forestGeneratedGroundTile(
                    biome,
                    worldTileX,
                    worldTileY,
                    forestSectionIsNearTrail(
                        exits, localColumn, localRow
                    )
                )
                isWall = tileIndex == ForestMapTileIndex.Tree ||
                    tileIndex == ForestMapTileIndex.Rock
            }

            map.setTile(mapColumn, mapRow, tileIndex)
            // Always clear or set collision; this cell held another logical
            // section before a possible window rebase.
            map.setWall(mapColumn, mapRow, isWall)
        }
    }

    // River construction is deliberately a second pass. Water and its bank
    // replace trails, scenery, decorations, and other base forest tiles.
    overlayForestRiverSection(
        map,
        physicalSectionX,
        physicalSectionY,
        worldSectionX,
        worldSectionY
    )
}

/** Restamps all nine physical sections around the current logical section. */
function rebuildForestFreeRoamWindow() {
    for (let physicalSectionY = 0;
        physicalSectionY < freeRoamWindowSectionCount;
        physicalSectionY++) {
        for (let physicalSectionX = 0;
            physicalSectionX < freeRoamWindowSectionCount;
            physicalSectionX++) {
            stampForestSection(
                forestFreeRoamMap,
                physicalSectionX,
                physicalSectionY,
                forestCenterWorldSectionX + physicalSectionX - 1,
                forestCenterWorldSectionY + physicalSectionY - 1
            )
        }
    }
}

/** Creates and activates a new deterministic Forest Free Roam session. */
function startForestFreeRoamGeneration() {
    forestFreeRoamSeed = createFreeRoamSeed()
    configureForestRiverGeneration(forestFreeRoamSeed)
    forestCenterWorldSectionX = 0
    forestCenterWorldSectionY = 0
    initializeForestFreeRoamTileset()
    buildForestHomeRegion()

    forestFreeRoamMap = createFreeRoamStreamingTilemap(
        forestFreeRoamTileset
    )
    rebuildForestFreeRoamWindow()
    tiles.setCurrentTilemap(forestFreeRoamMap)
    forestFreeRoamGenerationActive = true
}

/** Releases the active physical map reference when Free Roam closes. */
function stopForestFreeRoamGeneration() {
    forestFreeRoamGenerationActive = false
    forestFreeRoamMap = null
}

/**
 * Moves the logical window when the player crosses an 8x8 section boundary,
 * preserving velocity while shifting both player sprites by the same amount.
 */
function updateForestFreeRoamGeneration() {
    if (!forestFreeRoamGenerationActive ||
        drivingSessionState != DrivingSessionState.FreeRoam ||
        selectedFreeRoamTheme != FreeRoamTheme.Forest ||
        !player) {
        return
    }

    let sectionShiftX = freeRoamSectionShiftForPixel(player.x)
    let sectionShiftY = freeRoamSectionShiftForPixel(player.y)

    if (sectionShiftX == 0 && sectionShiftY == 0) {
        return
    }

    forestCenterWorldSectionX += sectionShiftX
    forestCenterWorldSectionY += sectionShiftY
    rebuildForestFreeRoamWindow()
    moveFreeRoamPlayerToRebasedPosition(
        freeRoamRebasedPixel(player.x),
        freeRoamRebasedPixel(player.y)
    )
}

/** Read-only hooks used by the full Free Roam map display. */
function forestFreeRoamCenterSectionX() {
    return forestCenterWorldSectionX
}

function forestFreeRoamCenterSectionY() {
    return forestCenterWorldSectionY
}

function forestFreeRoamMapData() {
    return forestFreeRoamMap
}

function forestFreeRoamPlayerWorldTileX() {
    if (!player) {
        return 4
    }
    return freeRoamSpriteWorldTileX(forestCenterWorldSectionX, player)
}

function forestFreeRoamPlayerWorldTileY() {
    if (!player) {
        return 4
    }
    return freeRoamSpriteWorldTileY(forestCenterWorldSectionY, player)
}

function forestFreeRoamHomeWorldTileX() {
    return 4
}

function forestFreeRoamHomeWorldTileY() {
    return 4
}
