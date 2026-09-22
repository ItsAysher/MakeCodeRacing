// Shared deterministic and streaming helpers for procedural Free Roam maps

/**
 * Every procedural theme uses 8x8 logical sections and keeps a 3x3 section
 * window in memory. At 16 pixels per tile this is a 24x24 / 384x384 world,
 * with the player continuously rebased into its center section.
 */
let freeRoamSectionSize = 8
let freeRoamTileSize = 16
let freeRoamWindowSectionCount = 3
let freeRoamWindowTileSize =
    freeRoamSectionSize * freeRoamWindowSectionCount
let freeRoamCenterSectionStartPixel =
    freeRoamSectionSize * freeRoamTileSize
let freeRoamCenterSectionEndPixel =
    freeRoamCenterSectionStartPixel * 2

let freeRoamWorldSeed = 0
let freeRoamGenerationVersion = 1

/** Creates the permanent world seed on first use and stores it immediately. */
function ensureFreeRoamWorldSeed() {
    if (freeRoamWorldSeed == 0) {
        freeRoamWorldSeed = randint(1, 1000000000)
        saveGameProgress()
    }
    return freeRoamWorldSeed
}

/** Derives an independent, persistent seed for one procedural theme. */
function freeRoamThemeSeed(themeSalt: number) {
    return freeRoamCoordinateHash(
        ensureFreeRoamWorldSeed(),
        themeSalt,
        freeRoamGenerationVersion,
        1009
    )
}

/** Returns a positive remainder for both positive and negative coordinates. */
function freeRoamPositiveModulo(value: number, divisor: number) {
    let result = value % divisor
    if (result < 0) {
        result += divisor
    }
    return result
}

/**
 * Deterministically mixes a seed, signed world coordinate, and decision salt.
 * Separate salts keep topology, artwork, and decoration choices independent.
 */
function freeRoamCoordinateHash(
    seed: number,
    x: number,
    y: number,
    salt: number
) {
    let value = x * 374761393 + y * 668265263 +
        seed * 69069 + salt * 362437
    value = value ^ (value << 13)
    value = value ^ (value >> 17)
    value = value ^ (value << 5)
    return value & 0x7fffffff
}

/** Creates the reusable physical tilemap used by a procedural theme. */
function createFreeRoamStreamingTilemap(tileset: Image[]) {
    let mapBuffer = control.createBuffer(
        4 + freeRoamWindowTileSize * freeRoamWindowTileSize
    )
    mapBuffer.setNumber(
        NumberFormat.UInt16LE,
        0,
        freeRoamWindowTileSize
    )
    mapBuffer.setNumber(
        NumberFormat.UInt16LE,
        2,
        freeRoamWindowTileSize
    )

    return tiles.createTilemap(
        mapBuffer,
        image.create(freeRoamWindowTileSize, freeRoamWindowTileSize),
        tileset.slice(),
        TileScale.Sixteen
    )
}

/** Starts only the map-specific generator selected in the Garage. */
function startSelectedFreeRoamGeneration() {
    if (selectedFreeRoamTheme == FreeRoamTheme.Forest) {
        startForestFreeRoamGeneration()
    } else if (selectedFreeRoamTheme == FreeRoamTheme.Highway) {
        startHighwayFreeRoamGeneration()
    } else {
        startCaveFreeRoamGeneration()
    }
}

/** Releases only the currently selected generator and its transient layers. */
function stopSelectedFreeRoamGeneration() {
    if (selectedFreeRoamTheme == FreeRoamTheme.Forest) {
        stopForestFreeRoamGeneration()
    } else if (selectedFreeRoamTheme == FreeRoamTheme.Highway) {
        stopHighwayFreeRoamGeneration()
    } else {
        stopCaveFreeRoamGeneration()
    }
}

/** Logical world tile represented by a column in the active 3x3 window. */
function freeRoamWindowWorldTileX(
    centerWorldSectionX: number,
    physicalColumn: number
) {
    return centerWorldSectionX * freeRoamSectionSize +
        physicalColumn - freeRoamSectionSize
}

/** Logical world tile represented by a row in the active 3x3 window. */
function freeRoamWindowWorldTileY(
    centerWorldSectionY: number,
    physicalRow: number
) {
    return centerWorldSectionY * freeRoamSectionSize +
        physicalRow - freeRoamSectionSize
}

/** Logical tile occupied by a sprite inside the active physical window. */
function freeRoamSpriteWorldTileX(
    centerWorldSectionX: number,
    sprite: Sprite
) {
    return freeRoamWindowWorldTileX(
        centerWorldSectionX,
        Math.floor(sprite.x / freeRoamTileSize)
    )
}

/** Logical tile occupied by a sprite inside the active physical window. */
function freeRoamSpriteWorldTileY(
    centerWorldSectionY: number,
    sprite: Sprite
) {
    return freeRoamWindowWorldTileY(
        centerWorldSectionY,
        Math.floor(sprite.y / freeRoamTileSize)
    )
}

/** Number of logical sections crossed by a physical pixel coordinate. */
function freeRoamSectionShiftForPixel(position: number) {
    let shift = 0
    let rebasedPosition = position
    let sectionPixelSize = freeRoamSectionSize * freeRoamTileSize

    while (rebasedPosition < freeRoamCenterSectionStartPixel) {
        shift--
        rebasedPosition += sectionPixelSize
    }
    while (rebasedPosition >= freeRoamCenterSectionEndPixel) {
        shift++
        rebasedPosition -= sectionPixelSize
    }
    return shift
}

/** Equivalent pixel coordinate inside the physical center section. */
function freeRoamRebasedPixel(position: number) {
    let rebasedPosition = position
    let sectionPixelSize = freeRoamSectionSize * freeRoamTileSize

    while (rebasedPosition < freeRoamCenterSectionStartPixel) {
        rebasedPosition += sectionPixelSize
    }
    while (rebasedPosition >= freeRoamCenterSectionEndPixel) {
        rebasedPosition -= sectionPixelSize
    }
    return rebasedPosition
}

/**
 * Moves both halves of the player after the map has been restamped. Velocity
 * is untouched, making the physical rebase visually continuous.
 */
function moveFreeRoamPlayerToRebasedPosition(
    nextPlayerX: number,
    nextPlayerY: number
) {
    let pixelShiftX = nextPlayerX - player.x
    let pixelShiftY = nextPlayerY - player.y
    player.setPosition(nextPlayerX, nextPlayerY)
    // Blink can cross a streaming boundary in one jump. Keep its world-space
    // trail (and other driving effects) aligned with the restamped road.
    for (let effect of sprites.allOfKind(SpriteKind.DrivingEffect)) {
        effect.setPosition(effect.x + pixelShiftX, effect.y + pixelShiftY)
    }

    // Rendering synchronization occurs earlier in the frame, so move the
    // visible half immediately to avoid a one-frame split.
    if (playerCarVisual) {
        playerCarVisual.setPosition(
            playerCarVisual.x + pixelShiftX,
            playerCarVisual.y + pixelShiftY
        )
    }
}

/** One streaming callback services whichever procedural theme is active. */
game.onUpdate(function () {
    if (drivingSessionState != DrivingSessionState.FreeRoam) {
        return
    }

    if (selectedFreeRoamTheme == FreeRoamTheme.Forest) {
        updateForestFreeRoamGeneration()
    } else if (selectedFreeRoamTheme == FreeRoamTheme.Highway) {
        updateHighwayFreeRoamGeneration()
    } else {
        updateCaveFreeRoamGeneration()
    }
})
