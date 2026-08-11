// Deterministic river overlays for Forest Free Roam

enum ForestRiverTileKind {
    None,
    Sand,
    Water
}

let forestRiverSeed = 0
let forestRiverCellSize = 64
let forestRiverSpawnPercent = 35

/** Starts a river layout whose bends remain stable for the whole session. */
function configureForestRiverGeneration(seed: number) {
    forestRiverSeed = seed
}

/** Each 64x64 logical region has one independent chance to contain a river. */
function forestRiverSpawnsInCell(cellX: number, cellY: number) {
    return freeRoamCoordinateHash(
        forestRiverSeed, cellX, cellY, 239
    ) % 100 < forestRiverSpawnPercent
}

/** A spawned feature occupies exactly 30 through 50 tiles along its axis. */
function forestRiverLength(cellX: number, cellY: number) {
    return 30 + freeRoamCoordinateHash(
        forestRiverSeed, cellX, cellY, 241
    ) % 21
}

/** Selects whether this cell's finite river travels left/right or up/down. */
function forestRiverIsHorizontal(cellX: number, cellY: number) {
    return freeRoamCoordinateHash(
        forestRiverSeed, cellX, cellY, 251
    ) % 2 == 0
}

/** Keeps each whole river two or three tiles wide from end to end. */
function forestRiverWaterWidth(cellX: number, cellY: number) {
    return 2 + freeRoamCoordinateHash(
        forestRiverSeed, cellX, cellY, 257
    ) % 2
}

/** Seeded but bounded displacement at one of three curve control points. */
function forestRiverCurveTarget(
    cellX: number,
    cellY: number,
    controlPoint: number
) {
    let firstTarget = freeRoamCoordinateHash(
        forestRiverSeed, cellX, cellY, 263
    ) % 17 - 8
    if (controlPoint == 0) {
        return firstTarget
    }

    let secondTarget = firstTarget + freeRoamCoordinateHash(
        forestRiverSeed, cellX, cellY, 269
    ) % 13 - 6
    secondTarget = Math.max(-10, Math.min(10, secondTarget))
    if (controlPoint == 1) {
        return secondTarget
    }

    let finalTarget = secondTarget + freeRoamCoordinateHash(
        forestRiverSeed, cellX, cellY, 271
    ) % 13 - 6
    return Math.max(-10, Math.min(10, finalTarget))
}

/**
 * Smoothly joins neighboring targets. Smoothstep has zero slope at either
 * endpoint, so consecutive segments form flowing S-curves without corners.
 */
function forestRiverCurveOffset(
    localAxisCoordinate: number,
    riverLength: number,
    cellX: number,
    cellY: number
) {
    let scaledPosition = localAxisCoordinate * 2 / (riverLength - 1)
    let segment = Math.floor(scaledPosition)
    let progress = scaledPosition - segment
    if (segment >= 2) {
        segment = 1
        progress = 1
    }
    let easedProgress = progress * progress * (3 - 2 * progress)
    let startOffset = forestRiverCurveTarget(cellX, cellY, segment)
    let endOffset = forestRiverCurveTarget(cellX, cellY, segment + 1)
    return Math.round(
        startOffset + (endOffset - startOffset) * easedProgress
    )
}

/** Tests a tile against the single finite river assigned to its region. */
function forestRiverCellHasWater(
    worldTileX: number,
    worldTileY: number,
    cellX: number,
    cellY: number
) {
    if (!forestRiverSpawnsInCell(cellX, cellY)) {
        return false
    }

    let cellLeft = cellX * forestRiverCellSize
    let cellTop = cellY * forestRiverCellSize
    let riverLength = forestRiverLength(cellX, cellY)
    let riverStart = Math.idiv(forestRiverCellSize - riverLength, 2)
    let horizontal = forestRiverIsHorizontal(cellX, cellY)
    let axisCoordinate = horizontal ? worldTileX - cellLeft :
        worldTileY - cellTop
    let crossCoordinate = horizontal ? worldTileY - cellTop :
        worldTileX - cellLeft
    let localAxisCoordinate = axisCoordinate - riverStart
    if (localAxisCoordinate < 0 || localAxisCoordinate >= riverLength) {
        return false
    }

    let center = Math.idiv(forestRiverCellSize, 2) +
        forestRiverCurveOffset(
            localAxisCoordinate, riverLength, cellX, cellY
        )
    let waterWidth = forestRiverWaterWidth(cellX, cellY)

    // A two-wide channel is centered between tiles; a three-wide channel is
    // centered on a tile. Doubled coordinates avoid fractional comparisons.
    let centerTwice = center * 2
    if (waterWidth == 2) {
        centerTwice++
    }
    return Math.abs(crossCoordinate * 2 - centerTwice) <= waterWidth - 1
}

/** True when this logical world tile belongs to any river's water channel. */
function forestRiverHasWater(worldTileX: number, worldTileY: number) {
    let cellX = Math.floor(worldTileX / forestRiverCellSize)
    let cellY = Math.floor(worldTileY / forestRiverCellSize)
    return forestRiverCellHasWater(
        worldTileX, worldTileY, cellX, cellY
    )
}

/**
 * Sand is the exact one-tile, eight-neighbor outline around water. Computing
 * it from the final water mask also keeps the bank intact around diagonal
 * bends and the rounded ends of each finite feature.
 */
function forestRiverTileKind(worldTileX: number, worldTileY: number) {
    if (forestRiverHasWater(worldTileX, worldTileY)) {
        return ForestRiverTileKind.Water
    }

    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset++) {
            if ((columnOffset != 0 || rowOffset != 0) &&
                forestRiverHasWater(
                    worldTileX + columnOffset,
                    worldTileY + rowOffset
                )) {
                return ForestRiverTileKind.Sand
            }
        }
    }
    return ForestRiverTileKind.None
}

/** Replaces the already-stamped forest section with its river overlay. */
function overlayForestRiverSection(
    map: tiles.TileMapData,
    physicalSectionX: number,
    physicalSectionY: number,
    worldSectionX: number,
    worldSectionY: number
) {
    for (let localRow = 0; localRow < freeRoamSectionSize; localRow++) {
        for (let localColumn = 0;
            localColumn < freeRoamSectionSize;
            localColumn++) {
            let worldTileX = worldSectionX * freeRoamSectionSize +
                localColumn
            let worldTileY = worldSectionY * freeRoamSectionSize + localRow
            let riverKind = forestRiverTileKind(worldTileX, worldTileY)
            if (riverKind == ForestRiverTileKind.None) {
                continue
            }

            let mapColumn = physicalSectionX * freeRoamSectionSize +
                localColumn
            let mapRow = physicalSectionY * freeRoamSectionSize + localRow
            if (riverKind == ForestRiverTileKind.Water) {
                map.setTile(mapColumn, mapRow, ForestMapTileIndex.RiverWater)
                map.setWall(mapColumn, mapRow, true)
            } else {
                map.setTile(mapColumn, mapRow, ForestMapTileIndex.RiverSand)
                map.setWall(mapColumn, mapRow, false)
            }
        }
    }
}
