// Seamless procedural generation for Highway Free Roam

enum HighwaySectionExit {
    North = 1,
    East = 2,
    South = 4,
    West = 8
}

enum HighwaySectionKind {
    Straight,
    Turn,
    TJunction,
    Cross
}

// The generated-road palette deliberately keeps the two road orientations
// separate. One road tile represents one lane, so every entering/exiting road
// uses local positions 1 through 6: exactly six driveable lane tiles wide.
enum HighwayMapTileIndex {
    Grass,
    GrassVariant2,
    GrassVariant3,
    RoadVertical,
    RoadHorizontal,
    Shoulder,
    RoadTurnSouthWest,
    RoadTurnSouthEast,
    RoadTurnNorthWest,
    RoadTurnNorthEast,
    RoadVerticalCrack,
    RoadHorizontalCrack,
    ShoulderCone
}

namespace SpriteKind {
    export const HighwayBridgeDeck = SpriteKind.create()
}

let highwayFreeRoamTileset: Image[] = []
let highwayBridgeDeckImage: Image = null
let highwayBridgeDeckSprites: Sprite[] = []

let highwayFreeRoamSpawnTile = freeRoamSectionSize + 4
let highwayHomeRegionSectionRadius = 2
let highwayHomeRegionSectionCount = 5
let highwayHomeRegionTileSize =
    highwayHomeRegionSectionCount * freeRoamSectionSize
let highwayBaseMapHomeOffset = 4

let highwayFreeRoamGenerationActive = false
let highwayFreeRoamSeed = 0
let highwayCenterWorldSectionX = 0
let highwayCenterWorldSectionY = 0
let highwayFreeRoamMap: tiles.TileMapData = null
let highwayHomeTileIndices: number[] = []
let highwayHomeWallFlags: boolean[] = []
let highwayBridgeDeckZ = 12
let highwayRouteLengthSections = 4
let highwayPlayerCameFromLoop = false

/** Caches base tiles and floor-backed road decorations in fixed order. */
function initializeHighwayFreeRoamTileset() {
    if (highwayFreeRoamTileset.length > 0) {
        return
    }

    highwayFreeRoamTileset.push(sprites.castle.tileDarkGrass1)
    highwayFreeRoamTileset.push(sprites.castle.tileDarkGrass2)
    highwayFreeRoamTileset.push(sprites.castle.tileDarkGrass3)
    highwayFreeRoamTileset.push(sprites.vehicle.roadVertical)
    highwayFreeRoamTileset.push(sprites.vehicle.roadHorizontal)
    highwayFreeRoamTileset.push(assets.tile`highwayShoulder`)
    highwayFreeRoamTileset.push(sprites.vehicle.roadTurn1)
    highwayFreeRoamTileset.push(sprites.vehicle.roadTurn2)
    highwayFreeRoamTileset.push(sprites.vehicle.roadTurn3)
    highwayFreeRoamTileset.push(sprites.vehicle.roadTurn4)

    let verticalCrack = sprites.vehicle.roadVertical.clone()
    verticalCrack.drawTransparentImage(assets.tile`highwayCrack`, 0, 0)
    highwayFreeRoamTileset.push(verticalCrack)

    let horizontalCrack = sprites.vehicle.roadHorizontal.clone()
    horizontalCrack.drawTransparentImage(assets.tile`highwayCrack`, 0, 0)
    highwayFreeRoamTileset.push(horizontalCrack)

    let shoulderCone = assets.tile`highwayShoulder`.clone()
    shoulderCone.drawTransparentImage(assets.tile`highwayCone`, 0, 0)
    highwayFreeRoamTileset.push(shoulderCone)

    // A bridge is a visual layer, not another collision plane. At a loop rim,
    // the vertical approach is the overhang and the loop road passes below it.
    highwayBridgeDeckImage = image.create(
        freeRoamSectionSize * freeRoamTileSize,
        freeRoamSectionSize * freeRoamTileSize
    )
    for (let row = 0; row < freeRoamSectionSize; row++) {
        highwayBridgeDeckImage.drawTransparentImage(
            assets.tile`highwayShoulder`,
            0,
            row * freeRoamTileSize
        )
        for (let lane = 1; lane <= 6; lane++) {
            highwayBridgeDeckImage.drawTransparentImage(
                sprites.vehicle.roadVertical,
                lane * freeRoamTileSize,
                row * freeRoamTileSize
            )
        }
        highwayBridgeDeckImage.drawTransparentImage(
            assets.tile`highwayShoulder`,
            7 * freeRoamTileSize,
            row * freeRoamTileSize
        )
    }
}

/** Finds the cached runtime index for one tile from the authored home map. */
function highwayRuntimeTileIndex(tileImage: Image) {
    for (let index = 0; index < highwayFreeRoamTileset.length; index++) {
        if (highwayFreeRoamTileset[index].equals(tileImage)) {
            return index
        }
    }

    // Future hand-authored home tiles remain intact even when they are not
    // part of the current generated-road vocabulary.
    highwayFreeRoamTileset.push(tileImage)
    return highwayFreeRoamTileset.length - 1
}

/** Selects the stable straight/turn arrangement for a two-by-two macro block. */
function highwayBlockUsesTurns(blockX: number, blockY: number) {
    return freeRoamCoordinateHash(
        highwayFreeRoamSeed, blockX, blockY, 173
    ) % 2 == 0
}

/** True only for sparse, non-overlapping macro-cell loop anchors. */
function highwayLoopAnchorAt(anchorX: number, anchorY: number) {
    if (freeRoamPositiveModulo(anchorX - 1, 4) != 0 ||
        freeRoamPositiveModulo(anchorY - 1, 4) != 0) {
        return false
    }

    return freeRoamCoordinateHash(
        highwayFreeRoamSeed,
        Math.floor((anchorX - 1) / 4),
        Math.floor((anchorY - 1) / 4),
        211
    ) % 100 < 24
}

/** Whether one horizontal macro edge belongs to a generated rounded loop. */
function highwayHorizontalMacroEdgeBelongsToLoop(leftX: number, y: number) {
    return highwayLoopAnchorAt(leftX, y) ||
        highwayLoopAnchorAt(leftX, y - 1)
}

/** Whether one vertical macro edge belongs to a generated rounded loop. */
function highwayVerticalMacroEdgeBelongsToLoop(x: number, topY: number) {
    return highwayLoopAnchorAt(x, topY) ||
        highwayLoopAnchorAt(x - 1, topY)
}

/** Converts a section coordinate to its containing seeded routing cell. */
function highwayMacroCoordinate(sectionCoordinate: number) {
    return Math.floor(sectionCoordinate / highwayRouteLengthSections)
}

/** Stable reciprocal horizontal edge in the large-scale route graph. */
function highwayHorizontalMacroConnection(leftX: number, y: number) {
    if (y == 0 || highwayHorizontalMacroEdgeBelongsToLoop(leftX, y)) {
        return true
    }

    let baseConnection = true
    if (freeRoamPositiveModulo(leftX, 2) == 0) {
        baseConnection = !highwayBlockUsesTurns(
            Math.floor(leftX / 2), Math.floor(y / 2)
        )
    }
    if (baseConnection) {
        return true
    }
    return freeRoamCoordinateHash(
        highwayFreeRoamSeed, leftX, y, 229
    ) % 100 < 16
}

/** Stable reciprocal vertical edge in the large-scale route graph. */
function highwayVerticalMacroConnection(x: number, topY: number) {
    if (x == 0 || highwayVerticalMacroEdgeBelongsToLoop(x, topY)) {
        return true
    }

    let baseConnection = false
    if (freeRoamPositiveModulo(topY, 2) == 0) {
        baseConnection = highwayBlockUsesTurns(
            Math.floor(x / 2), Math.floor(topY / 2)
        )
    }
    if (baseConnection) {
        return true
    }
    return freeRoamCoordinateHash(
        highwayFreeRoamSeed, x, topY, 251
    ) % 100 < 16
}

/** True when a section is on the rim of one selected large loop. */
function highwaySectionIsOnLoop(sectionX: number, sectionY: number) {
    let macroX = highwayMacroCoordinate(sectionX)
    let macroY = highwayMacroCoordinate(sectionY)
    for (let yOffset = -1; yOffset <= 0; yOffset++) {
        for (let xOffset = -1; xOffset <= 0; xOffset++) {
            let anchorX = macroX + xOffset
            let anchorY = macroY + yOffset
            if (!highwayLoopAnchorAt(anchorX, anchorY)) continue
            let left = anchorX * highwayRouteLengthSections
            let top = anchorY * highwayRouteLengthSections
            let right = left + highwayRouteLengthSections
            let bottom = top + highwayRouteLengthSections
            if (((sectionY == top || sectionY == bottom) &&
                sectionX >= left && sectionX <= right) ||
                ((sectionX == left || sectionX == right) &&
                    sectionY >= top && sectionY <= bottom)) {
                return true
            }
        }
    }
    return false
}

/** True at either loop-rim crossing where its vertical chord is elevated. */
function highwaySectionIsLoopOverpass(sectionX: number, sectionY: number) {
    let macroX = highwayMacroCoordinate(sectionX)
    let macroY = highwayMacroCoordinate(sectionY)
    for (let yOffset = -1; yOffset <= 0; yOffset++) {
        for (let xOffset = -1; xOffset <= 0; xOffset++) {
            let anchorX = macroX + xOffset
            let anchorY = macroY + yOffset
            if (!highwayLoopAnchorAt(anchorX, anchorY)) continue
            let left = anchorX * highwayRouteLengthSections
            let top = anchorY * highwayRouteLengthSections
            let middleX = left + Math.floor(highwayRouteLengthSections / 2)
            if (sectionX == middleX &&
                (sectionY == top ||
                    sectionY == top + highwayRouteLengthSections)) {
                return true
            }
        }
    }
    return false
}

/** Adds the elevated north/south chord through a selected loop's circle. */
function highwayVerticalEdgeBelongsToLoopChord(x: number, topY: number) {
    let macroX = highwayMacroCoordinate(x)
    let macroY = highwayMacroCoordinate(topY)
    for (let yOffset = -1; yOffset <= 1; yOffset++) {
        for (let xOffset = -1; xOffset <= 0; xOffset++) {
            let anchorX = macroX + xOffset
            let anchorY = macroY + yOffset
            if (!highwayLoopAnchorAt(anchorX, anchorY)) continue
            let left = anchorX * highwayRouteLengthSections
            let top = anchorY * highwayRouteLengthSections
            let middleX = left + Math.floor(highwayRouteLengthSections / 2)
            if (x == middleX && topY >= top - highwayRouteLengthSections &&
                topY < top + highwayRouteLengthSections * 2) {
                return true
            }
        }
    }
    return false
}

/** True when a horizontal section edge crosses the home-region perimeter. */
function highwayHorizontalEdgeBordersHome(leftX: number, y: number) {
    return (leftX == -highwayHomeRegionSectionRadius - 1 ||
        leftX == highwayHomeRegionSectionRadius) &&
        y >= -highwayHomeRegionSectionRadius &&
        y <= highwayHomeRegionSectionRadius
}

/** True when a vertical section edge crosses the home-region perimeter. */
function highwayVerticalEdgeBordersHome(x: number, topY: number) {
    return (topY == -highwayHomeRegionSectionRadius - 1 ||
        topY == highwayHomeRegionSectionRadius) &&
        x >= -highwayHomeRegionSectionRadius &&
        x <= highwayHomeRegionSectionRadius
}

/** True for the shared edge from (leftX, y) to (leftX + 1, y). */
function highwayHorizontalSectionConnection(leftX: number, y: number) {
    // The aligned wrapper exposes only the original centered west/east road.
    if (highwayHorizontalEdgeBordersHome(leftX, y)) {
        return y == 0
    }
    // The authored home road joins the long horizontal macro backbone.
    if (y == 0) {
        return true
    }
    if (freeRoamPositiveModulo(y, highwayRouteLengthSections) != 0) {
        return false
    }
    return highwayHorizontalMacroConnection(
        highwayMacroCoordinate(leftX),
        y / highwayRouteLengthSections
    )
}

/** True for the shared edge from (x, topY) to (x, topY + 1). */
function highwayVerticalSectionConnection(x: number, topY: number) {
    // The aligned wrapper exposes only the original centered north/south road.
    if (highwayVerticalEdgeBordersHome(x, topY)) {
        return x == 0
    }
    // The authored home road joins the long vertical macro backbone.
    if (x == 0) {
        return true
    }
    if (highwayVerticalEdgeBelongsToLoopChord(x, topY)) {
        return true
    }
    if (freeRoamPositiveModulo(x, highwayRouteLengthSections) != 0) {
        return false
    }
    return highwayVerticalMacroConnection(
        x / highwayRouteLengthSections,
        highwayMacroCoordinate(topY)
    )
}

/** Builds the reciprocal North/East/South/West mask for one section. */
function highwaySectionExits(worldSectionX: number, worldSectionY: number) {
    let exits = 0

    if (highwayVerticalSectionConnection(
        worldSectionX, worldSectionY - 1
    )) {
        exits |= HighwaySectionExit.North
    }
    if (highwayHorizontalSectionConnection(
        worldSectionX, worldSectionY
    )) {
        exits |= HighwaySectionExit.East
    }
    if (highwayVerticalSectionConnection(
        worldSectionX, worldSectionY
    )) {
        exits |= HighwaySectionExit.South
    }
    if (highwayHorizontalSectionConnection(
        worldSectionX - 1, worldSectionY
    )) {
        exits |= HighwaySectionExit.West
    }

    return exits
}

/** Classifies section exits for artwork and deterministic detail choices. */
function highwaySectionKindForExits(exits: number) {
    let exitCount = 0
    if (exits & HighwaySectionExit.North) exitCount++
    if (exits & HighwaySectionExit.East) exitCount++
    if (exits & HighwaySectionExit.South) exitCount++
    if (exits & HighwaySectionExit.West) exitCount++

    if (exitCount == 4) {
        return HighwaySectionKind.Cross
    } else if (exitCount == 3) {
        return HighwaySectionKind.TJunction
    } else if (
        exits == (HighwaySectionExit.North | HighwaySectionExit.South) ||
        exits == (HighwaySectionExit.East | HighwaySectionExit.West)
    ) {
        return HighwaySectionKind.Straight
    }
    return HighwaySectionKind.Turn
}

/**
 * Tests the six-lane road footprint. Every arm uses coordinates 1..6 across
 * its travel direction. Turns and junctions merge those arms in a shared 6x6
 * center, but no entering road widens beyond six lane tiles.
 */
function highwaySectionHasRoad(
    exits: number,
    localColumn: number,
    localRow: number
) {
    if (exits == 0) {
        return false
    }
    if (localColumn < 0 || localColumn >= freeRoamSectionSize ||
        localRow < 0 || localRow >= freeRoamSectionSize) {
        return false
    }

    let inCenterColumns = localColumn >= 1 && localColumn <= 6
    let inCenterRows = localRow >= 1 && localRow <= 6

    if (inCenterColumns && inCenterRows) {
        return true
    }
    if ((exits & HighwaySectionExit.North) &&
        inCenterColumns && localRow == 0) {
        return true
    }
    if ((exits & HighwaySectionExit.East) &&
        inCenterRows && localColumn >= 7) {
        return true
    }
    if ((exits & HighwaySectionExit.South) &&
        inCenterColumns && localRow >= 7) {
        return true
    }
    if ((exits & HighwaySectionExit.West) &&
        inCenterRows && localColumn == 0) {
        return true
    }

    return false
}

/** Draws shoulder art on every non-road tile touching the road boundary. */
function highwaySectionHasShoulder(
    exits: number,
    localColumn: number,
    localRow: number
) {
    if (highwaySectionHasRoad(exits, localColumn, localRow)) {
        return false
    }

    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
            if ((columnOffset != 0 || rowOffset != 0) &&
                highwaySectionHasRoad(
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

/** Returns the appropriate authored corner tile for one two-exit turn. */
function highwayTurnTileForExits(exits: number) {
    if (exits == (HighwaySectionExit.South | HighwaySectionExit.West)) {
        return HighwayMapTileIndex.RoadTurnSouthWest
    } else if (
        exits == (HighwaySectionExit.South | HighwaySectionExit.East)
    ) {
        return HighwayMapTileIndex.RoadTurnSouthEast
    } else if (
        exits == (HighwaySectionExit.North | HighwaySectionExit.West)
    ) {
        return HighwayMapTileIndex.RoadTurnNorthWest
    }
    return HighwayMapTileIndex.RoadTurnNorthEast
}

/** Selects horizontal/vertical artwork within a merged road footprint. */
function highwayRoadTile(
    exits: number,
    localColumn: number,
    localRow: number,
    worldTileX: number,
    worldTileY: number,
    sectionKind: HighwaySectionKind,
    hasOverpass: boolean
) {
    let hasHorizontalExit =
        (exits & (HighwaySectionExit.East | HighwaySectionExit.West)) != 0
    let hasVerticalExit =
        (exits & (HighwaySectionExit.North | HighwaySectionExit.South)) != 0
    let tileIndex = HighwayMapTileIndex.RoadHorizontal

    // A single turn marker at the center makes bends easy to read without
    // filling the six-wide merging area with repeated corner artwork.
    if (sectionKind == HighwaySectionKind.Turn &&
        localColumn == 3 && localRow == 3) {
        return highwayTurnTileForExits(exits)
    }

    if (!hasHorizontalExit) {
        tileIndex = HighwayMapTileIndex.RoadVertical
    } else if (!hasVerticalExit) {
        tileIndex = HighwayMapTileIndex.RoadHorizontal
    } else if (hasOverpass) {
        // The loop rim is horizontal below the crossing; the cached vertical
        // deck covers the center while its north/south arms remain readable.
        if (localRow < 1 || localRow > 6) {
            tileIndex = HighwayMapTileIndex.RoadVertical
        } else {
            tileIndex = HighwayMapTileIndex.RoadHorizontal
        }
    } else {
        let horizontalDistance = Math.abs(localColumn - 3.5)
        let verticalDistance = Math.abs(localRow - 3.5)
        if (verticalDistance > horizontalDistance) {
            tileIndex = HighwayMapTileIndex.RoadVertical
        } else if (horizontalDistance == verticalDistance &&
            freeRoamCoordinateHash(
                highwayFreeRoamSeed, worldTileX, worldTileY, 277
            ) % 2 == 0) {
            tileIndex = HighwayMapTileIndex.RoadVertical
        }
    }

    return tileIndex
}

/** True only at the two grade-separated crossings of a selected large loop. */
function highwaySectionHasOverpass(
    worldSectionX: number,
    worldSectionY: number,
    exits: number
) {
    if (exits != 15) {
        return false
    }
    return highwaySectionIsLoopOverpass(worldSectionX, worldSectionY)
}

/** Stable grass variation matching the old Highway Free Roam probabilities. */
function highwayGrassTileAtWorldTile(worldTileX: number, worldTileY: number) {
    let grassRoll = freeRoamCoordinateHash(
        highwayFreeRoamSeed, worldTileX, worldTileY, 307
    ) % 100
    if (grassRoll < 14) {
        return HighwayMapTileIndex.GrassVariant2
    } else if (grassRoll < 25) {
        return HighwayMapTileIndex.GrassVariant3
    }
    return HighwayMapTileIndex.Grass
}

/** Applies stable crack details without persistent cover-tile overlays. */
function highwayDecoratedRoadTileAtWorldTile(
    tileIndex: number,
    worldTileX: number,
    worldTileY: number
) {
    // The authored spawn is base tile (16,16), or logical world tile (4,4).
    if (Math.abs(worldTileX - 4) <= 2 &&
        Math.abs(worldTileY - 4) <= 2) {
        return tileIndex
    }

    let roadRoll = freeRoamCoordinateHash(
        highwayFreeRoamSeed, worldTileX, worldTileY, 331
    ) % 100
    if (tileIndex == HighwayMapTileIndex.RoadVertical) {
        if (roadRoll < 5) {
            return HighwayMapTileIndex.RoadVerticalCrack
        }
    } else if (tileIndex == HighwayMapTileIndex.RoadHorizontal) {
        if (roadRoll < 5) {
            return HighwayMapTileIndex.RoadHorizontalCrack
        }
    }
    return tileIndex
}

/** Places cones only on solid shoulder cells, never in a driveable lane. */
function highwayShoulderTileAtWorldTile(
    worldTileX: number,
    worldTileY: number
) {
    if (freeRoamCoordinateHash(
        highwayFreeRoamSeed, worldTileX, worldTileY, 337
    ) % 100 < 2) {
        return HighwayMapTileIndex.ShoulderCone
    }
    return HighwayMapTileIndex.Shoulder
}

/** Writes one source tile into the cached 40x40 aligned home region. */
function setHighwayHomeTile(
    column: number,
    row: number,
    tileIndex: number,
    isWall: boolean
) {
    let arrayIndex = row * highwayHomeRegionTileSize + column
    highwayHomeTileIndices[arrayIndex] = tileIndex
    highwayHomeWallFlags[arrayIndex] = isWall
}

/** Extends one six-lane north/south row through the home wrapper. */
function setHighwayVerticalWrapperRow(row: number) {
    let firstLane = 17
    let firstShoulder = firstLane - 1
    setHighwayHomeTile(
        firstShoulder,
        row,
        HighwayMapTileIndex.Shoulder,
        true
    )
    for (let column = firstLane; column <= 22; column++) {
        setHighwayHomeTile(
            column,
            row,
            HighwayMapTileIndex.RoadVertical,
            false
        )
    }
    setHighwayHomeTile(
        23,
        row,
        HighwayMapTileIndex.Shoulder,
        true
    )
}

/** Extends one six-lane west/east column through the home wrapper. */
function setHighwayHorizontalWrapperColumn(
    column: number
) {
    let firstLane = 17
    let firstShoulder = firstLane - 1
    setHighwayHomeTile(
        column,
        firstShoulder,
        HighwayMapTileIndex.Shoulder,
        true
    )
    for (let row = firstLane; row <= 22; row++) {
        setHighwayHomeTile(
            column,
            row,
            HighwayMapTileIndex.RoadHorizontal,
            false
        )
    }
    setHighwayHomeTile(
        column,
        23,
        HighwayMapTileIndex.Shoulder,
        true
    )
}

/**
 * Preserves the authored 32x32 Highway as the definitive center. Its original
 * edge roads and procedural sockets are both six tiles wide, so the wrapper
 * extends the original road directly to generated sections without tapering.
 */
function buildHighwayHomeRegion() {
    if (highwayHomeTileIndices.length > 0) {
        return
    }

    let homeTileCount = highwayHomeRegionTileSize * highwayHomeRegionTileSize
    for (let index = 0; index < homeTileCount; index++) {
        highwayHomeTileIndices.push(HighwayMapTileIndex.Grass)
        highwayHomeWallFlags.push(false)
    }

    let authoredHighwayMap = tilemap`freeRoamHighwayMap`
    for (let row = 0; row < authoredHighwayMap.height; row++) {
        for (let column = 0; column < authoredHighwayMap.width; column++) {
            let authoredTileIndex = authoredHighwayMap.getTile(column, row)
            setHighwayHomeTile(
                column + highwayBaseMapHomeOffset,
                row + highwayBaseMapHomeOffset,
                highwayRuntimeTileIndex(
                    authoredHighwayMap.getTileImage(authoredTileIndex)
                ),
                authoredHighwayMap.isWall(column, row)
            )
        }
    }

    setHighwayVerticalWrapperRow(3)
    setHighwayVerticalWrapperRow(2)
    setHighwayVerticalWrapperRow(1)
    setHighwayVerticalWrapperRow(0)
    setHighwayVerticalWrapperRow(36)
    setHighwayVerticalWrapperRow(37)
    setHighwayVerticalWrapperRow(38)
    setHighwayVerticalWrapperRow(39)

    setHighwayHorizontalWrapperColumn(3)
    setHighwayHorizontalWrapperColumn(2)
    setHighwayHorizontalWrapperColumn(1)
    setHighwayHorizontalWrapperColumn(0)
    setHighwayHorizontalWrapperColumn(36)
    setHighwayHorizontalWrapperColumn(37)
    setHighwayHorizontalWrapperColumn(38)
    setHighwayHorizontalWrapperColumn(39)
}

function highwaySectionIsInHomeRegion(
    worldSectionX: number,
    worldSectionY: number
) {
    return Math.abs(worldSectionX) <= highwayHomeRegionSectionRadius &&
        Math.abs(worldSectionY) <= highwayHomeRegionSectionRadius
}

/** Returns the home array index for one logical section-local tile. */
function highwayHomeArrayIndex(
    worldSectionX: number,
    worldSectionY: number,
    localColumn: number,
    localRow: number
) {
    let homeColumn = (worldSectionX + highwayHomeRegionSectionRadius) *
        freeRoamSectionSize + localColumn
    let homeRow = (worldSectionY + highwayHomeRegionSectionRadius) *
        freeRoamSectionSize + localRow
    return homeRow * highwayHomeRegionTileSize + homeColumn
}

/** Writes one authored or generated section into the reusable tilemap. */
function stampHighwaySection(
    map: tiles.TileMapData,
    physicalSectionX: number,
    physicalSectionY: number,
    worldSectionX: number,
    worldSectionY: number
) {
    let isHomeSection = highwaySectionIsInHomeRegion(
        worldSectionX, worldSectionY
    )
    let exits = 0
    let sectionKind = HighwaySectionKind.Cross
    let hasOverpass = false

    if (!isHomeSection) {
        exits = highwaySectionExits(worldSectionX, worldSectionY)
        sectionKind = highwaySectionKindForExits(exits)
        hasOverpass = highwaySectionHasOverpass(
            worldSectionX, worldSectionY, exits
        )
    }

    for (let localRow = 0; localRow < freeRoamSectionSize; localRow++) {
        for (let localColumn = 0;
            localColumn < freeRoamSectionSize;
            localColumn++) {
            let mapColumn = physicalSectionX * freeRoamSectionSize +
                localColumn
            let mapRow = physicalSectionY * freeRoamSectionSize + localRow
            let worldTileX = worldSectionX * freeRoamSectionSize +
                localColumn
            let worldTileY = worldSectionY * freeRoamSectionSize + localRow
            let tileIndex = HighwayMapTileIndex.Grass
            let isWall = false

            if (isHomeSection) {
                let homeIndex = highwayHomeArrayIndex(
                    worldSectionX,
                    worldSectionY,
                    localColumn,
                    localRow
                )
                tileIndex = highwayHomeTileIndices[homeIndex]
                isWall = highwayHomeWallFlags[homeIndex]
            } else if (highwaySectionHasRoad(
                exits, localColumn, localRow
            )) {
                tileIndex = highwayRoadTile(
                    exits,
                    localColumn,
                    localRow,
                    worldTileX,
                    worldTileY,
                    sectionKind,
                    hasOverpass
                )
            } else if (highwaySectionHasShoulder(
                exits, localColumn, localRow
            )) {
                tileIndex = highwayShoulderTileAtWorldTile(
                    worldTileX, worldTileY
                )
                isWall = true
            }

            if (!isWall && tileIndex == HighwayMapTileIndex.Grass) {
                tileIndex = highwayGrassTileAtWorldTile(
                    worldTileX, worldTileY
                )
            } else if (!isWall && !hasOverpass) {
                // A bridge has one shared Arcade collision plane. Keep its
                // entire crossing clear so a cone cannot block both routes.
                tileIndex = highwayDecoratedRoadTileAtWorldTile(
                    tileIndex, worldTileX, worldTileY
                )
            }

            map.setTile(mapColumn, mapRow, tileIndex)
            // Always reset collision so the previous logical section cannot
            // leave an invisible wall after the physical window is reused.
            map.setWall(mapColumn, mapRow, isWall)
        }
    }
}

/** Removes every fixed-window bridge visual before a restamp or shutdown. */
function destroyHighwayBridgeDeckSprites() {
    for (let bridgeDeck of highwayBridgeDeckSprites) {
        bridgeDeck.destroy()
    }
    highwayBridgeDeckSprites = []
}

/** Adds one cached bridge deck sprite at a physical section position. */
function createHighwayBridgeDeckSprite(
    physicalSectionX: number,
    physicalSectionY: number
) {
    let sectionPixelSize = freeRoamSectionSize * freeRoamTileSize
    let bridgeDeck = sprites.create(
        highwayBridgeDeckImage,
        SpriteKind.HighwayBridgeDeck
    )
    bridgeDeck.setFlag(SpriteFlag.Ghost, true)
    bridgeDeck.z = highwayBridgeDeckZ
    bridgeDeck.setPosition(
        physicalSectionX * sectionPixelSize + sectionPixelSize / 2,
        physicalSectionY * sectionPixelSize + sectionPixelSize / 2
    )
    highwayBridgeDeckSprites.push(bridgeDeck)
}

/** Restamps the 3x3 window and recreates only its visible bridge layers. */
function rebuildHighwayFreeRoamWindow() {
    destroyHighwayBridgeDeckSprites()

    for (let physicalSectionY = 0;
        physicalSectionY < freeRoamWindowSectionCount;
        physicalSectionY++) {
        for (let physicalSectionX = 0;
            physicalSectionX < freeRoamWindowSectionCount;
            physicalSectionX++) {
            let worldSectionX = highwayCenterWorldSectionX +
                physicalSectionX - 1
            let worldSectionY = highwayCenterWorldSectionY +
                physicalSectionY - 1

            stampHighwaySection(
                highwayFreeRoamMap,
                physicalSectionX,
                physicalSectionY,
                worldSectionX,
                worldSectionY
            )

            if (!highwaySectionIsInHomeRegion(
                worldSectionX, worldSectionY
            )) {
                let exits = highwaySectionExits(
                    worldSectionX, worldSectionY
                )
                if (highwaySectionHasOverpass(
                    worldSectionX, worldSectionY, exits
                )) {
                    createHighwayBridgeDeckSprite(
                        physicalSectionX, physicalSectionY
                    )
                }
            }
        }
    }
}

/** Starts a fresh streamed Highway session while retaining fixed memory use. */
function startHighwayFreeRoamGeneration() {
    highwayFreeRoamSeed = freeRoamThemeSeed(2)
    // Four through seven 8x8 sections gives 32..56 tiles between bends,
    // staying within the requested 30..60-tile straight-run range.
    highwayRouteLengthSections = 4 + freeRoamCoordinateHash(
        highwayFreeRoamSeed, 0, 0, 331
    ) % 4
    highwayCenterWorldSectionX = 0
    highwayCenterWorldSectionY = 0
    highwayPlayerCameFromLoop = false
    initializeHighwayFreeRoamTileset()
    buildHighwayHomeRegion()

    highwayFreeRoamMap = createFreeRoamStreamingTilemap(
        highwayFreeRoamTileset
    )
    rebuildHighwayFreeRoamWindow()
    tiles.setCurrentTilemap(highwayFreeRoamMap)
    highwayFreeRoamGenerationActive = true
}

/** Releases the active map and every bridge sprite on session exit. */
function stopHighwayFreeRoamGeneration() {
    highwayFreeRoamGenerationActive = false
    highwayPlayerCameFromLoop = false
    destroyHighwayBridgeDeckSprites()
    if (playerCarVisual && player) {
        playerCarVisual.z = player.z + 1
    }
    highwayFreeRoamMap = null
}

/** Map-display accessors for the active Highway session. */
function highwayFreeRoamGenerationIsActive() {
    return highwayFreeRoamGenerationActive
}

function highwayFreeRoamCenterWorldSectionX() {
    return highwayCenterWorldSectionX
}

function highwayFreeRoamCenterWorldSectionY() {
    return highwayCenterWorldSectionY
}

function highwayFreeRoamMapData() {
    return highwayFreeRoamMap
}

function highwayFreeRoamWindowWorldTileLeft() {
    return (highwayCenterWorldSectionX - 1) * freeRoamSectionSize
}

function highwayFreeRoamWindowWorldTileTop() {
    return (highwayCenterWorldSectionY - 1) * freeRoamSectionSize
}

function highwayFreeRoamPlayerWorldTileX() {
    if (!player) {
        return highwayFreeRoamHomeWorldTileX()
    }
    return freeRoamSpriteWorldTileX(highwayCenterWorldSectionX, player)
}

function highwayFreeRoamPlayerWorldTileY() {
    if (!player) {
        return highwayFreeRoamHomeWorldTileY()
    }
    return freeRoamSpriteWorldTileY(highwayCenterWorldSectionY, player)
}

function highwayFreeRoamHomeWorldTileX() {
    return 4
}

function highwayFreeRoamHomeWorldTileY() {
    return 4
}

function highwayFreeRoamHomeDirectionX() {
    return highwayFreeRoamHomeWorldTileX() -
        highwayFreeRoamPlayerWorldTileX()
}

function highwayFreeRoamHomeDirectionY() {
    return highwayFreeRoamHomeWorldTileY() -
        highwayFreeRoamPlayerWorldTileY()
}

/**
 * Changes only rendering depth inside the current bridge zone. Arcade has one
 * tile collision plane, so both routes stay physically open; dominant travel
 * entry history selects the lower loop plane or the elevated chord plane.
 */
function updateHighwayBridgePlayerLayer() {
    if (!playerCarVisual || !player) {
        return
    }

    let exits = highwaySectionExits(
        highwayCenterWorldSectionX,
        highwayCenterWorldSectionY
    )
    let onGeneratedOverpass = !highwaySectionIsInHomeRegion(
        highwayCenterWorldSectionX,
        highwayCenterWorldSectionY
    ) && highwaySectionHasOverpass(
        highwayCenterWorldSectionX,
        highwayCenterWorldSectionY,
        exits
    )

    if (!onGeneratedOverpass) {
        playerCarVisual.z = player.z + 1
        return
    }

    if (highwayPlayerCameFromLoop) {
        playerCarVisual.z = player.z + 1
    } else {
        playerCarVisual.z = highwayBridgeDeckZ + 1
    }
}

/** Advances the streamed window and rebases the player without changing speed. */
function updateHighwayFreeRoamGeneration() {
    if (!highwayFreeRoamGenerationActive ||
        drivingSessionState != DrivingSessionState.FreeRoam ||
        selectedFreeRoamTheme != FreeRoamTheme.Highway ||
        !player) {
        return
    }

    let sectionShiftX = freeRoamSectionShiftForPixel(player.x)
    let sectionShiftY = freeRoamSectionShiftForPixel(player.y)

    if (sectionShiftX != 0 || sectionShiftY != 0) {
        let previousSectionX = highwayCenterWorldSectionX
        let previousSectionY = highwayCenterWorldSectionY
        highwayCenterWorldSectionX += sectionShiftX
        highwayCenterWorldSectionY += sectionShiftY
        if (highwaySectionIsLoopOverpass(
            highwayCenterWorldSectionX,
            highwayCenterWorldSectionY
        )) {
            highwayPlayerCameFromLoop = highwaySectionIsOnLoop(
                previousSectionX, previousSectionY
            )
        } else {
            highwayPlayerCameFromLoop = false
        }
        rebuildHighwayFreeRoamWindow()
        moveFreeRoamPlayerToRebasedPosition(
            freeRoamRebasedPixel(player.x),
            freeRoamRebasedPixel(player.y)
        )
    }

    updateHighwayBridgePlayerLayer()
}
