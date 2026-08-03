// Race minimap rendering and HUD lifecycle

let raceMinimap: Sprite = null
let cachedRaceMinimapFullMap: Image = null
let cachedRaceMinimapFrame: Image = null
let raceMinimapScale = MinimapScale.Eighth
let raceMinimapContentWidth = 60
let raceMinimapContentHeight = 40
let cachedRaceMinimapPlayerX = -1
let cachedRaceMinimapPlayerY = -1
let cachedRaceMinimapDirection = -1
let cachedRaceMinimapBodyTier = -1
let cachedRaceMinimapPaintRevision = -1

/** Invalidates track-dependent minimap data before a different race map loads. */
function resetRaceMinimapCache() {
    cachedRaceMinimapFullMap = null
    cachedRaceMinimapPlayerX = -1
    cachedRaceMinimapPlayerY = -1
    cachedRaceMinimapDirection = -1
    cachedRaceMinimapBodyTier = -1
    cachedRaceMinimapPaintRevision = -1
}

/** Builds the static full-track image once for the active race map. */
function ensureRaceMinimapCache() {
    if (!cachedRaceMinimapFullMap) {
        let map = minimap.minimap(raceMinimapScale, 0, 0)
        cachedRaceMinimapFullMap = minimap.getImage(map)
    }

    if (!cachedRaceMinimapFrame) {
        cachedRaceMinimapFrame = image.create(
            raceMinimapContentWidth + 2,
            raceMinimapContentHeight + 2
        )
        cachedRaceMinimapFrame.fill(1)
    }
}

/** Draws the moving player marker over the cached map viewport. */
function drawPlayerOnRaceMinimap(sourceLeft: number, sourceTop: number) {
    let spriteImageScale = Math.max(
        raceMinimapScale - MinimapSpriteScale.Double,
        0
    )
    let sampleStep = 1 << spriteImageScale
    let markerLeft = 1 +
        (playerCarVisual.x >> raceMinimapScale) -
        ((playerCarVisual.width / 2) >> spriteImageScale) -
        sourceLeft
    let markerTop = 1 +
        (playerCarVisual.y >> raceMinimapScale) -
        ((playerCarVisual.height / 2) >> spriteImageScale) -
        sourceTop

    for (let column = 0; column < playerCarVisual.image.width; column += sampleStep) {
        for (let row = 0; row < playerCarVisual.image.height; row += sampleStep) {
            let color = playerCarVisual.image.getPixel(column, row)

            if (color != 0) {
                cachedRaceMinimapFrame.setPixel(
                    markerLeft + (column >> spriteImageScale),
                    markerTop + (row >> spriteImageScale),
                    color
                )
            }
        }
    }
}

/**
 * Builds a fixed-size window into the full minimap, centered on the player.
 * Near a map edge, the window stops scrolling instead of showing empty space.
 */
function localRaceMinimapImage() {
    ensureRaceMinimapCache()

    let maximumLeft = Math.max(
        0,
        cachedRaceMinimapFullMap.width - raceMinimapContentWidth
    )
    let maximumTop = Math.max(
        0,
        cachedRaceMinimapFullMap.height - raceMinimapContentHeight
    )
    let playerMapX = playerCarVisual.x >> raceMinimapScale
    let playerMapY = playerCarVisual.y >> raceMinimapScale
    let sourceLeft = Math.max(
        0,
        Math.min(maximumLeft, playerMapX - raceMinimapContentWidth / 2)
    )
    let sourceTop = Math.max(
        0,
        Math.min(maximumTop, playerMapY - raceMinimapContentHeight / 2)
    )

    // Only the small viewport changes during a race. The expensive full-track
    // render remains cached until a different race map is selected.
    cachedRaceMinimapFrame.fillRect(
        1,
        1,
        raceMinimapContentWidth,
        raceMinimapContentHeight,
        0
    )
    cachedRaceMinimapFrame.drawImage(
        cachedRaceMinimapFullMap,
        1 - sourceLeft,
        1 - sourceTop
    )
    drawPlayerOnRaceMinimap(sourceLeft, sourceTop)
    cachedRaceMinimapPlayerX = playerMapX
    cachedRaceMinimapPlayerY = playerMapY
    cachedRaceMinimapDirection = currentCarImageDirection
    cachedRaceMinimapBodyTier = equippedBodyTier
    cachedRaceMinimapPaintRevision = playerPaintRevision
    return cachedRaceMinimapFrame
}

/** Reports whether the viewport or player marker has visibly changed. */
function raceMinimapNeedsRedraw() {
    return !cachedRaceMinimapFullMap ||
        !cachedRaceMinimapFrame ||
        cachedRaceMinimapPlayerX !=
            (playerCarVisual.x >> raceMinimapScale) ||
        cachedRaceMinimapPlayerY !=
            (playerCarVisual.y >> raceMinimapScale) ||
        cachedRaceMinimapDirection != currentCarImageDirection ||
        cachedRaceMinimapBodyTier != equippedBodyTier ||
        cachedRaceMinimapPaintRevision != playerPaintRevision
}

/**
 * Rebuilds the player-centered minimap and keeps its HUD sprite current.
 * The sprite is created lazily on the first race update.
 */
function updateRaceMinimap() {
    if (drivingSessionState != DrivingSessionState.Race) {
        return
    }

    let mapImage = cachedRaceMinimapFrame
    if (raceMinimapNeedsRedraw()) {
        mapImage = localRaceMinimapImage()
    }

    if (!raceMinimap) {
        raceMinimap = sprites.create(mapImage, SpriteKind.MinimapHud)
        raceMinimap.setFlag(SpriteFlag.RelativeToCamera, true)
        raceMinimap.setFlag(SpriteFlag.Ghost, true)
        raceMinimap.z = 100
        raceMinimap.right = 158
        raceMinimap.bottom = 118
    } else {
        raceMinimap.setFlag(SpriteFlag.Invisible, false)
    }
}

function hideRaceMinimap() {
    if (raceMinimap) {
        raceMinimap.setFlag(SpriteFlag.Invisible, true)
    }

    // Release the large track image between races. The small fixed-size frame
    // remains attached to the reusable HUD sprite.
    resetRaceMinimapCache()
}

game.onUpdateInterval(100, function () {
    updateRaceMinimap()
})
