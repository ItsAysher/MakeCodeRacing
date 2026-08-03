// Race minimap rendering and HUD lifecycle

let raceMinimap: Sprite = null

/**
 * Builds a fixed-size window into the full minimap, centered on the player.
 * Near a map edge, the window stops scrolling instead of showing empty space.
 */
function localRaceMinimapImage() {
    let mapScale = MinimapScale.Eighth
    let map = minimap.minimap(mapScale, 0, 0)
    minimap.includeSprite(map, playerCarVisual, MinimapSpriteScale.Double)

    let fullMap = minimap.getImage(map)
    let contentWidth = 60
    let contentHeight = 40
    let maximumLeft = Math.max(0, fullMap.width - contentWidth)
    let maximumTop = Math.max(0, fullMap.height - contentHeight)
    let playerMapX = playerCarVisual.x >> mapScale
    let playerMapY = playerCarVisual.y >> mapScale
    let sourceLeft = Math.max(0, Math.min(maximumLeft, playerMapX - contentWidth / 2))
    let sourceTop = Math.max(0, Math.min(maximumTop, playerMapY - contentHeight / 2))

    let content = image.create(contentWidth, contentHeight)
    content.drawImage(fullMap, -sourceLeft, -sourceTop)

    let framedMap = image.create(contentWidth + 2, contentHeight + 2)
    framedMap.fill(1)
    framedMap.drawImage(content, 1, 1)
    return framedMap
}

/**
 * Rebuilds the player-centered minimap and keeps its HUD sprite current.
 * The sprite is created lazily on the first race update.
 */
function updateRaceMinimap() {
    if (!raceInProgress) {
        return
    }

    let mapImage = localRaceMinimapImage()

    if (!raceMinimap) {
        raceMinimap = sprites.create(mapImage, SpriteKind.MinimapHud)
        raceMinimap.setFlag(SpriteFlag.RelativeToCamera, true)
        raceMinimap.setFlag(SpriteFlag.Ghost, true)
        raceMinimap.z = 100
    } else {
        raceMinimap.setImage(mapImage)
        raceMinimap.setFlag(SpriteFlag.Invisible, false)
    }

    // Reset the HUD anchor after replacing its image.
    raceMinimap.right = 158
    raceMinimap.bottom = 118
}

function hideRaceMinimap() {
    if (raceMinimap) {
        raceMinimap.setFlag(SpriteFlag.Invisible, true)
    }
}

game.onUpdateInterval(100, function () {
    updateRaceMinimap()
})
