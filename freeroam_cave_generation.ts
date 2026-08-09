// Seamless procedural generation for Cave Free Roam

enum CaveSectionExit {
    North = 1,
    East = 2,
    South = 4,
    West = 8
}

enum CaveSectionKind {
    Straight,
    Turn,
    TJunction,
    Cross
}

enum CaveDecorationKind {
    None,
    Rubble,
    Moss,
    Crystal
}

// A fixed runtime palette avoids depending on the generated base-map tileset
// order while still reusing the exact wall and floor art from that map.
enum CaveMapTileIndex {
    Floor,
    FloorNorthWest,
    FloorNorthEast,
    FloorSouthWest,
    FloorSouthEast,
    OuterNorth0,
    OuterNorth1,
    OuterNorth2,
    OuterEast0,
    OuterSouth0,
    OuterSouth1,
    OuterSouth2,
    OuterWest0,
    OuterWest1,
    OuterWest2,
    OuterNorthWest,
    OuterNorthEast,
    OuterSouthEast,
    OuterSouthWest,
    InnerNorthWest,
    InnerNorthEast,
    InnerSouthEast,
    InnerSouthWest
}

let caveBaseFloorTileCount = CaveMapTileIndex.FloorSouthEast + 1
let caveDecorationVariantCount = CaveDecorationKind.Crystal
let caveDecorationTileStartIndex = CaveMapTileIndex.InnerSouthWest + 1
let caveFreeRoamTileset: Image[] = []

let caveSectionSize = 8
let caveTileSize = 16
let caveWindowSectionCount = 3
let caveWindowTileSize = caveSectionSize * caveWindowSectionCount
let caveCenterSectionStartPixel = caveSectionSize * caveTileSize
let caveCenterSectionEndPixel = caveCenterSectionStartPixel +
    caveSectionSize * caveTileSize
let caveFreeRoamSpawnTile = caveSectionSize + 4
let caveHomeRegionSectionRadius = 2
let caveHomeRegionSectionCount = 5
let caveHomeRegionTileSize = caveHomeRegionSectionCount * caveSectionSize
let caveBaseMapHomeOffset = 4

let caveFreeRoamGenerationActive = false
let caveFreeRoamSeed = 0
let caveCenterWorldSectionX = 0
let caveCenterWorldSectionY = 0
let caveFreeRoamMap: tiles.TileMapData = null
let caveHomeTileIndices: number[] = []
let caveHomeWallFlags: boolean[] = []

/** Caches base, wall, and floor-backed decoration images in fixed order. */
function initializeCaveFreeRoamTileset() {
    if (caveFreeRoamTileset.length > 0) {
        return
    }

    let floorTiles = [
        sprites.dungeon.darkGroundCenter,
        sprites.dungeon.darkGroundNorthWest1,
        sprites.dungeon.darkGroundNorthEast1,
        sprites.dungeon.darkGroundSouthWest1,
        sprites.dungeon.darkGroundSouthEast1
    ]
    let wallTiles = [
        sprites.dungeon.purpleOuterNorth0,
        sprites.dungeon.purpleOuterNorth1,
        sprites.dungeon.purpleOuterNorth2,
        sprites.dungeon.purpleOuterEast0,
        sprites.dungeon.purpleOuterSouth0,
        sprites.dungeon.purpleOuterSouth1,
        sprites.dungeon.purpleOuterSouth2,
        sprites.dungeon.purpleOuterWest0,
        sprites.dungeon.purpleOuterWest1,
        sprites.dungeon.purpleOuterWest2,
        sprites.dungeon.purpleOuterNorthWest,
        sprites.dungeon.purpleOuterNorthEast,
        sprites.dungeon.purpleOuterSouthEast,
        sprites.dungeon.purpleOuterSouthWest,
        sprites.dungeon.purpleInnerNorthWest,
        sprites.dungeon.purpleInnerNorthEast,
        sprites.dungeon.purpleInnerSouthEast,
        sprites.dungeon.purpleInnerSouthWest
    ]
    let decorationImages = [
        assets.tile`caveRubble`,
        assets.tile`caveMoss`,
        assets.tile`caveCrystal`
    ]

    for (let floorTile of floorTiles) {
        caveFreeRoamTileset.push(floorTile)
    }
    for (let wallTile of wallTiles) {
        caveFreeRoamTileset.push(wallTile)
    }

    // Tilemap streaming cannot safely keep physical cover-tile overlays.
    // Composite each decoration over every floor style once and reuse it.
    for (let floorTile of floorTiles) {
        for (let decorationImage of decorationImages) {
            let decoratedFloor = floorTile.clone()
            decoratedFloor.drawTransparentImage(decorationImage, 0, 0)
            caveFreeRoamTileset.push(decoratedFloor)
        }
    }
}

/** Returns a positive remainder for both positive and negative coordinates. */
function cavePositiveModulo(value: number, divisor: number) {
    let result = value % divisor
    if (result < 0) {
        result += divisor
    }
    return result
}

/** Mixes a world coordinate with the current cave seed. */
function caveCoordinateHash(x: number, y: number, salt: number) {
    let value = x * 374761393 + y * 668265263 +
        caveFreeRoamSeed * 69069 + salt * 362437
    value = value ^ (value << 13)
    value = value ^ (value >> 17)
    value = value ^ (value << 5)
    return value & 0x7fffffff
}

/**
 * Selects whether a two-by-two world-section block swaps two horizontal
 * routes through a pair of turns. Unswapped blocks produce straight pieces.
 */
function caveBlockUsesTurns(blockX: number, blockY: number) {
    return caveCoordinateHash(blockX, blockY, 17) % 2 == 0
}

/** True when a horizontal section edge crosses the home-region perimeter. */
function caveHorizontalEdgeBordersHome(leftX: number, y: number) {
    return (leftX == -caveHomeRegionSectionRadius - 1 ||
        leftX == caveHomeRegionSectionRadius) &&
        y >= -caveHomeRegionSectionRadius &&
        y <= caveHomeRegionSectionRadius
}

/** True when a vertical section edge crosses the home-region perimeter. */
function caveVerticalEdgeBordersHome(x: number, topY: number) {
    return (topY == -caveHomeRegionSectionRadius - 1 ||
        topY == caveHomeRegionSectionRadius) &&
        x >= -caveHomeRegionSectionRadius &&
        x <= caveHomeRegionSectionRadius
}

/** Keeps sections immediately above/below the home region connected. */
function caveHorizontalEdgeRunsAlongHome(leftX: number, y: number) {
    return (y == -caveHomeRegionSectionRadius - 1 ||
        y == caveHomeRegionSectionRadius + 1) &&
        leftX >= -caveHomeRegionSectionRadius - 1 &&
        leftX <= caveHomeRegionSectionRadius
}

/** Keeps sections immediately left/right of the home region connected. */
function caveVerticalEdgeRunsAlongHome(x: number, topY: number) {
    return (x == -caveHomeRegionSectionRadius - 1 ||
        x == caveHomeRegionSectionRadius + 1) &&
        topY >= -caveHomeRegionSectionRadius - 1 &&
        topY <= caveHomeRegionSectionRadius
}

/** True when the horizontal edge from (leftX, y) to (leftX + 1, y) is open. */
function caveHorizontalSectionConnection(leftX: number, y: number) {
    // Only the authored map's centered west/east sockets may cross its edge.
    if (caveHorizontalEdgeBordersHome(leftX, y)) {
        return y == 0
    }
    if (caveHorizontalEdgeRunsAlongHome(leftX, y)) {
        return true
    }

    // An always-open horizontal backbone guarantees infinite travel east and
    // west from the starting section for every possible random seed.
    if (y == 0) {
        return true
    }

    let baseConnection = true

    // Even left coordinates are the internal edge of a two-column block.
    // A turning block closes this edge and substitutes a vertical connection.
    if (cavePositiveModulo(leftX, 2) == 0) {
        baseConnection = !caveBlockUsesTurns(
            Math.floor(leftX / 2),
            Math.floor(y / 2)
        )
    }

    if (baseConnection) {
        return true
    }

    // Extra reciprocal edges convert some Straight/Turn sections into
    // T-junctions and Cross sections without ever creating a dead end.
    return caveCoordinateHash(leftX, y, 43) % 100 < 20
}

/** True when the vertical edge from (x, topY) to (x, topY + 1) is open. */
function caveVerticalSectionConnection(x: number, topY: number) {
    // Only the authored map's centered north/south sockets may cross its edge.
    if (caveVerticalEdgeBordersHome(x, topY)) {
        return x == 0
    }
    if (caveVerticalEdgeRunsAlongHome(x, topY)) {
        return true
    }

    // The matching vertical backbone makes the starting section a Cross and
    // guarantees infinite north/south travel as well.
    if (x == 0) {
        return true
    }

    let baseConnection = false

    // A turning block connects its two rows internally. Edges between
    // two-row blocks begin closed and may be opened by the reciprocal hash.
    if (cavePositiveModulo(topY, 2) == 0) {
        baseConnection = caveBlockUsesTurns(
            Math.floor(x / 2),
            Math.floor(topY / 2)
        )
    }

    if (baseConnection) {
        return true
    }

    return caveCoordinateHash(x, topY, 71) % 100 < 20
}

/** Builds the reciprocal North/East/South/West exit mask for one section. */
function caveSectionExits(worldSectionX: number, worldSectionY: number) {
    let exits = 0

    if (caveVerticalSectionConnection(worldSectionX, worldSectionY - 1)) {
        exits |= CaveSectionExit.North
    }
    if (caveHorizontalSectionConnection(worldSectionX, worldSectionY)) {
        exits |= CaveSectionExit.East
    }
    if (caveVerticalSectionConnection(worldSectionX, worldSectionY)) {
        exits |= CaveSectionExit.South
    }
    if (caveHorizontalSectionConnection(worldSectionX - 1, worldSectionY)) {
        exits |= CaveSectionExit.West
    }

    return exits
}

/**
 * Classifies a rotated section as one of four archetypes. Their canonical
 * exit masks are Straight E-W (10), Turn N-E (3), T N-E-W (11), and Cross
 * (15); reciprocal edge rules supply every compatible rotation.
 */
function caveSectionKindForExits(exits: number) {
    let exitCount = 0
    if (exits & CaveSectionExit.North) exitCount++
    if (exits & CaveSectionExit.East) exitCount++
    if (exits & CaveSectionExit.South) exitCount++
    if (exits & CaveSectionExit.West) exitCount++

    if (exitCount == 4) {
        return CaveSectionKind.Cross
    } else if (exitCount == 3) {
        return CaveSectionKind.TJunction
    } else if (
        exits == (CaveSectionExit.North | CaveSectionExit.South) ||
        exits == (CaveSectionExit.East | CaveSectionExit.West)
    ) {
        return CaveSectionKind.Straight
    }

    return CaveSectionKind.Turn
}

/**
 * The four section archetypes all use a four-tile-wide tunnel. Open sides use
 * the base cave socket: wall rails at local positions 1 and 6, and driveable
 * floor at positions 2 through 5.
 */
function caveSectionHasCorridor(
    exits: number,
    localColumn: number,
    localRow: number
) {
    if (localColumn < 0 || localColumn >= caveSectionSize ||
        localRow < 0 || localRow >= caveSectionSize) {
        return false
    }

    let inCenterColumns = localColumn >= 2 && localColumn <= 5
    let inCenterRows = localRow >= 2 && localRow <= 5

    if (inCenterColumns && inCenterRows) {
        return true
    }
    if ((exits & CaveSectionExit.North) &&
        inCenterColumns && localRow <= 1) {
        return true
    }
    if ((exits & CaveSectionExit.East) &&
        inCenterRows && localColumn >= 6) {
        return true
    }
    if ((exits & CaveSectionExit.South) &&
        inCenterColumns && localRow >= 6) {
        return true
    }
    if ((exits & CaveSectionExit.West) &&
        inCenterRows && localColumn <= 1) {
        return true
    }

    return false
}

/** Adds a continuous one-tile wall boundary around an archetype's corridor. */
function caveSectionHasWall(
    exits: number,
    localColumn: number,
    localRow: number
) {
    if (caveSectionHasCorridor(exits, localColumn, localRow)) {
        return false
    }

    // Include diagonal neighbours so turns never leave a corner-sized gap.
    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
            if ((columnOffset != 0 || rowOffset != 0) &&
                caveSectionHasCorridor(
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

/** Selects a safe decorative straight-wall variant from the base tileset. */
function caveStraightWallTile(
    side: CaveSectionExit,
    worldTileX: number,
    worldTileY: number,
    sectionKind: CaveSectionKind
) {
    let variant = caveCoordinateHash(
        worldTileX,
        worldTileY,
        101 + sectionKind
    ) % 3

    if (side == CaveSectionExit.North) {
        if (variant == 1) return CaveMapTileIndex.OuterNorth1
        if (variant == 2) return CaveMapTileIndex.OuterNorth2
        return CaveMapTileIndex.OuterNorth0
    } else if (side == CaveSectionExit.South) {
        if (variant == 1) return CaveMapTileIndex.OuterSouth1
        if (variant == 2) return CaveMapTileIndex.OuterSouth2
        return CaveMapTileIndex.OuterSouth0
    } else if (side == CaveSectionExit.West) {
        if (variant == 1) return CaveMapTileIndex.OuterWest1
        if (variant == 2) return CaveMapTileIndex.OuterWest2
        return CaveMapTileIndex.OuterWest0
    }

    // The authored cave uses only the East0 variant for east-facing rails.
    return CaveMapTileIndex.OuterEast0
}

/**
 * Chooses straight, inner-corner, or outer-corner artwork from the authored
 * cave according to which side of this wall belongs to the corridor.
 */
function caveWallTile(
    exits: number,
    localColumn: number,
    localRow: number,
    worldTileX: number,
    worldTileY: number,
    sectionKind: CaveSectionKind
) {
    let corridorNorth = caveSectionHasCorridor(
        exits, localColumn, localRow - 1
    )
    let corridorEast = caveSectionHasCorridor(
        exits, localColumn + 1, localRow
    )
    let corridorSouth = caveSectionHasCorridor(
        exits, localColumn, localRow + 1
    )
    let corridorWest = caveSectionHasCorridor(
        exits, localColumn - 1, localRow
    )

    // A corridor touching two cardinal sides forms a concave/inner corner.
    if (corridorEast && corridorSouth) {
        return CaveMapTileIndex.InnerSouthEast
    } else if (corridorWest && corridorSouth) {
        return CaveMapTileIndex.InnerSouthWest
    } else if (corridorEast && corridorNorth) {
        return CaveMapTileIndex.InnerNorthEast
    } else if (corridorWest && corridorNorth) {
        return CaveMapTileIndex.InnerNorthWest
    }

    if (corridorSouth) {
        return caveStraightWallTile(
            CaveSectionExit.North,
            worldTileX,
            worldTileY,
            sectionKind
        )
    } else if (corridorNorth) {
        return caveStraightWallTile(
            CaveSectionExit.South,
            worldTileX,
            worldTileY,
            sectionKind
        )
    } else if (corridorEast) {
        return caveStraightWallTile(
            CaveSectionExit.West,
            worldTileX,
            worldTileY,
            sectionKind
        )
    } else if (corridorWest) {
        return caveStraightWallTile(
            CaveSectionExit.East,
            worldTileX,
            worldTileY,
            sectionKind
        )
    }

    // No cardinal corridor neighbour means this is the convex/outer corner
    // inserted to close the diagonal gap around a turn.
    if (caveSectionHasCorridor(
        exits, localColumn + 1, localRow + 1
    )) {
        return CaveMapTileIndex.OuterNorthWest
    } else if (caveSectionHasCorridor(
        exits, localColumn - 1, localRow + 1
    )) {
        return CaveMapTileIndex.OuterNorthEast
    } else if (caveSectionHasCorridor(
        exits, localColumn + 1, localRow - 1
    )) {
        return CaveMapTileIndex.OuterSouthEast
    } else if (caveSectionHasCorridor(
        exits, localColumn - 1, localRow - 1
    )) {
        return CaveMapTileIndex.OuterSouthWest
    }

    // Every generated wall borders the corridor, but retain a valid fallback
    // so malformed future templates never become invisible collision tiles.
    return CaveMapTileIndex.OuterNorth0
}

/** Finds the cached runtime index for an authored cave tile image. */
function caveRuntimeTileIndex(tileImage: Image) {
    for (let index = 0; index < caveFreeRoamTileset.length; index++) {
        if (caveFreeRoamTileset[index].equals(tileImage)) {
            return index
        }
    }

    // Preserve future authored-map tiles even if they are not part of the
    // current floor/wall vocabulary. Unknown non-wall tiles stay undecorated.
    caveFreeRoamTileset.push(tileImage)
    return caveFreeRoamTileset.length - 1
}

/** Writes one source tile into the cached 40x40 aligned home region. */
function setCaveHomeTile(
    column: number,
    row: number,
    tileIndex: number,
    isWall: boolean
) {
    let arrayIndex = row * caveHomeRegionTileSize + column
    caveHomeTileIndices[arrayIndex] = tileIndex
    caveHomeWallFlags[arrayIndex] = isWall
}

/**
 * Centers the definitive 32x32 authored cave inside a 40x40 region. The
 * four-tile wrapper extends only its four existing sockets to an 8x8-aligned
 * outer edge, allowing procedural sections to begin beyond the base map.
 */
function buildCaveHomeRegion() {
    if (caveHomeTileIndices.length > 0) {
        return
    }

    let homeTileCount = caveHomeRegionTileSize * caveHomeRegionTileSize
    for (let index = 0; index < homeTileCount; index++) {
        caveHomeTileIndices.push(CaveMapTileIndex.Floor)
        caveHomeWallFlags.push(false)
    }

    let authoredCaveMap = tilemap`freeRoamCaveMap`
    for (let row = 0; row < authoredCaveMap.height; row++) {
        for (let column = 0; column < authoredCaveMap.width; column++) {
            let authoredTileIndex = authoredCaveMap.getTile(column, row)
            setCaveHomeTile(
                column + caveBaseMapHomeOffset,
                row + caveBaseMapHomeOffset,
                caveRuntimeTileIndex(
                    authoredCaveMap.getTileImage(authoredTileIndex)
                ),
                authoredCaveMap.isWall(column, row)
            )
        }
    }

    let leftRail = caveBaseMapHomeOffset + 13
    let rightRail = caveBaseMapHomeOffset + 18
    let topRail = caveBaseMapHomeOffset + 13
    let bottomRail = caveBaseMapHomeOffset + 18
    let farWrapperStart = caveBaseMapHomeOffset + authoredCaveMap.width

    for (let offset = 0; offset < caveBaseMapHomeOffset; offset++) {
        let farCoordinate = farWrapperStart + offset

        // North and south branches use vertical rails.
        setCaveHomeTile(
            leftRail, offset, CaveMapTileIndex.OuterWest1, true
        )
        setCaveHomeTile(
            rightRail, offset, CaveMapTileIndex.OuterEast0, true
        )
        setCaveHomeTile(
            leftRail, farCoordinate, CaveMapTileIndex.OuterWest1, true
        )
        setCaveHomeTile(
            rightRail, farCoordinate, CaveMapTileIndex.OuterEast0, true
        )

        // West and east branches use horizontal rails.
        setCaveHomeTile(
            offset, topRail, CaveMapTileIndex.OuterNorth0, true
        )
        setCaveHomeTile(
            offset, bottomRail, CaveMapTileIndex.OuterSouth0, true
        )
        setCaveHomeTile(
            farCoordinate, topRail, CaveMapTileIndex.OuterNorth0, true
        )
        setCaveHomeTile(
            farCoordinate, bottomRail, CaveMapTileIndex.OuterSouth0, true
        )
    }
}

function caveSectionIsInHomeRegion(
    worldSectionX: number,
    worldSectionY: number
) {
    return Math.abs(worldSectionX) <= caveHomeRegionSectionRadius &&
        Math.abs(worldSectionY) <= caveHomeRegionSectionRadius
}

/** Returns the home-region array index for a tile in a logical section. */
function caveHomeArrayIndex(
    worldSectionX: number,
    worldSectionY: number,
    localColumn: number,
    localRow: number
) {
    let homeColumn = (worldSectionX + caveHomeRegionSectionRadius) *
        caveSectionSize + localColumn
    let homeRow = (worldSectionY + caveHomeRegionSectionRadius) *
        caveSectionSize + localRow
    return homeRow * caveHomeRegionTileSize + homeColumn
}

/** True for each base-map cross or wrapper tile that must stay unobstructed. */
function caveHomeTileIsMainTunnel(worldTileX: number, worldTileY: number) {
    return (worldTileX >= 2 && worldTileX <= 5) ||
        (worldTileY >= 2 && worldTileY <= 5)
}

/** Recreates the original Cave decoration probabilities deterministically. */
function caveDecorationAtWorldTile(
    worldTileX: number,
    worldTileY: number,
    crystalAllowed: boolean
) {
    // The authored spawn is base tile (16,16), which is world tile (4,4)
    // after placing the base at offset four inside the aligned home region.
    if (Math.abs(worldTileX - 4) <= 2 &&
        Math.abs(worldTileY - 4) <= 2) {
        return CaveDecorationKind.None
    }

    let decorationRoll = caveCoordinateHash(worldTileX, worldTileY, 149) % 100
    if (decorationRoll < 4) {
        return CaveDecorationKind.Rubble
    } else if (decorationRoll < 10 && crystalAllowed) {
        return CaveDecorationKind.Crystal
    } else if (decorationRoll < 17) {
        return CaveDecorationKind.Moss
    }

    return CaveDecorationKind.None
}

/** Gets the cached floor-backed tile for one decoration kind. */
function caveDecoratedFloorTileIndex(
    floorTileIndex: number,
    decorationKind: CaveDecorationKind
) {
    return caveDecorationTileStartIndex +
        floorTileIndex * caveDecorationVariantCount +
        decorationKind - 1
}

/** Writes one rotated 8x8 section into the reusable physical tilemap. */
function stampCaveSection(
    map: tiles.TileMapData,
    physicalSectionX: number,
    physicalSectionY: number,
    worldSectionX: number,
    worldSectionY: number
) {
    let isHomeSection = caveSectionIsInHomeRegion(
        worldSectionX, worldSectionY
    )
    let exits = 0
    let sectionKind = CaveSectionKind.Cross

    if (!isHomeSection) {
        exits = caveSectionExits(worldSectionX, worldSectionY)
        sectionKind = caveSectionKindForExits(exits)
    }

    for (let localRow = 0; localRow < caveSectionSize; localRow++) {
        for (let localColumn = 0;
            localColumn < caveSectionSize;
            localColumn++) {
            let mapColumn = physicalSectionX * caveSectionSize + localColumn
            let mapRow = physicalSectionY * caveSectionSize + localRow
            let tileIndex = CaveMapTileIndex.Floor
            let isWall = false
            let worldTileX = worldSectionX * caveSectionSize + localColumn
            let worldTileY = worldSectionY * caveSectionSize + localRow
            let crystalAllowed = true

            if (isHomeSection) {
                let homeIndex = caveHomeArrayIndex(
                    worldSectionX,
                    worldSectionY,
                    localColumn,
                    localRow
                )
                tileIndex = caveHomeTileIndices[homeIndex]
                isWall = caveHomeWallFlags[homeIndex]
                crystalAllowed = !caveHomeTileIsMainTunnel(
                    worldTileX, worldTileY
                )
            } else {
                isWall = caveSectionHasWall(exits, localColumn, localRow)
                if (isWall) {
                    tileIndex = caveWallTile(
                        exits,
                        localColumn,
                        localRow,
                        worldTileX,
                        worldTileY,
                        sectionKind
                    )
                }
                crystalAllowed = !caveSectionHasCorridor(
                    exits, localColumn, localRow
                )
            }

            // Decorations are selected only after proving the source is one
            // of the authored floor tiles. Purple walls can never receive one.
            if (!isWall && tileIndex >= 0 &&
                tileIndex < caveBaseFloorTileCount) {
                let decorationKind = caveDecorationAtWorldTile(
                    worldTileX,
                    worldTileY,
                    crystalAllowed
                )
                if (decorationKind != CaveDecorationKind.None) {
                    tileIndex = caveDecoratedFloorTileIndex(
                        tileIndex, decorationKind
                    )
                    if (decorationKind == CaveDecorationKind.Crystal) {
                        isWall = true
                    }
                }
            }

            map.setTile(mapColumn, mapRow, tileIndex)
            // Always reset this flag so a previous section cannot leave an
            // invisible collision tile behind after the window moves.
            map.setWall(mapColumn, mapRow, isWall)
        }
    }
}

/** Restamps the 3x3 physical window around the current logical section. */
function rebuildCaveFreeRoamWindow() {
    for (let physicalSectionY = 0;
        physicalSectionY < caveWindowSectionCount;
        physicalSectionY++) {
        for (let physicalSectionX = 0;
            physicalSectionX < caveWindowSectionCount;
            physicalSectionX++) {
            stampCaveSection(
                caveFreeRoamMap,
                physicalSectionX,
                physicalSectionY,
                caveCenterWorldSectionX + physicalSectionX - 1,
                caveCenterWorldSectionY + physicalSectionY - 1
            )
        }
    }
}

/** Creates and activates a fresh browser-only infinite Cave Free Roam world. */
function startCaveFreeRoamGeneration() {
    caveFreeRoamSeed = randint(0, 1000000000)
    caveCenterWorldSectionX = 0
    caveCenterWorldSectionY = 0
    initializeCaveFreeRoamTileset()
    buildCaveHomeRegion()

    let mapBuffer = control.createBuffer(
        4 + caveWindowTileSize * caveWindowTileSize
    )
    mapBuffer.setNumber(
        NumberFormat.UInt16LE,
        0,
        caveWindowTileSize
    )
    mapBuffer.setNumber(
        NumberFormat.UInt16LE,
        2,
        caveWindowTileSize
    )

    caveFreeRoamMap = tiles.createTilemap(
        mapBuffer,
        image.create(caveWindowTileSize, caveWindowTileSize),
        caveFreeRoamTileset.slice(),
        TileScale.Sixteen
    )
    rebuildCaveFreeRoamWindow()
    tiles.setCurrentTilemap(caveFreeRoamMap)
    caveFreeRoamGenerationActive = true
}

/** Releases generator state when any driving session is closed. */
function stopCaveFreeRoamGeneration() {
    caveFreeRoamGenerationActive = false
    caveFreeRoamMap = null
}

/**
 * Advances the logical world after the player crosses a section boundary,
 * then moves the physical sprites back into the center section. The tilemap
 * changes by the same distance, so the camera presents one continuous world.
 */
function updateCaveFreeRoamGeneration() {
    if (!caveFreeRoamGenerationActive ||
        drivingSessionState != DrivingSessionState.FreeRoam ||
        selectedFreeRoamTheme != FreeRoamTheme.Cave ||
        !player) {
        return
    }

    let nextPlayerX = player.x
    let nextPlayerY = player.y
    let sectionShiftX = 0
    let sectionShiftY = 0
    let sectionPixelSize = caveSectionSize * caveTileSize

    while (nextPlayerX < caveCenterSectionStartPixel) {
        sectionShiftX--
        nextPlayerX += sectionPixelSize
    }
    while (nextPlayerX >= caveCenterSectionEndPixel) {
        sectionShiftX++
        nextPlayerX -= sectionPixelSize
    }
    while (nextPlayerY < caveCenterSectionStartPixel) {
        sectionShiftY--
        nextPlayerY += sectionPixelSize
    }
    while (nextPlayerY >= caveCenterSectionEndPixel) {
        sectionShiftY++
        nextPlayerY -= sectionPixelSize
    }

    if (sectionShiftX == 0 && sectionShiftY == 0) {
        return
    }

    caveCenterWorldSectionX += sectionShiftX
    caveCenterWorldSectionY += sectionShiftY
    rebuildCaveFreeRoamWindow()

    let pixelShiftX = nextPlayerX - player.x
    let pixelShiftY = nextPlayerY - player.y
    player.setPosition(nextPlayerX, nextPlayerY)

    // Player rendering updates earlier in the frame, so shift the visible
    // sprite immediately as well to prevent a one-frame split.
    if (playerCarVisual) {
        playerCarVisual.setPosition(
            playerCarVisual.x + pixelShiftX,
            playerCarVisual.y + pixelShiftY
        )
    }
}

// Register once and gate by state; starting Free Roam repeatedly must not
// accumulate streaming callbacks.
game.onUpdate(function () {
    updateCaveFreeRoamGeneration()
})
