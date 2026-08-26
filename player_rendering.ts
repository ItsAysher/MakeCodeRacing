// Player car appearance, cached customization, and directional rendering

let currentCarImageDirection = CarImageDirection.Up
let currentCarBodyIndex = -1
let cachedPlayerCarImages: Image[] = []
let cachedPlayerCarPaintRevision = -1
let renderedCarImageDirection = -1
let renderedCarBodyIndex = -1
let renderedCarPaintRevision = -1
let playerCarVisual: Sprite = null

/**
 * Composites one body direction with its primary, secondary, and accent artwork.
 * The base remains underneath so neutral details not included in a color layer
 * continue to render.
 */
function renderCustomizedCarImage(bodyIndex: number, direction: CarImageDirection) {
    let renderedImage = allCarBodyImages[bodyIndex][direction].clone()
    drawCustomizedCarPart(
        renderedImage,
        allCarBodyPrimaryImages[bodyIndex][direction],
        bodyIndex,
        CarPaintPart.Primary
    )
    drawCustomizedCarPart(
        renderedImage,
        allCarBodySecondaryImages[bodyIndex][direction],
        bodyIndex,
        CarPaintPart.Secondary
    )
    drawCustomizedCarPart(
        renderedImage,
        allCarBodyAccentImages[bodyIndex][direction],
        bodyIndex,
        CarPaintPart.Accent
    )
    return renderedImage
}

/** Rebuilds all four player directions after a body or paint change. */
function rebuildPlayerCarImageCache() {
    currentCarBodyIndex = equippedBodyTier
    cachedPlayerCarPaintRevision = playerPaintRevision
    cachedPlayerCarImages = []

    cachedPlayerCarImages.push(renderCustomizedCarImage(currentCarBodyIndex, CarImageDirection.Up))
    cachedPlayerCarImages.push(renderCustomizedCarImage(currentCarBodyIndex, CarImageDirection.Down))
    cachedPlayerCarImages.push(renderCustomizedCarImage(currentCarBodyIndex, CarImageDirection.Left))
    cachedPlayerCarImages.push(renderCustomizedCarImage(currentCarBodyIndex, CarImageDirection.Right))
}

/** Ensures the directional cache matches the currently equipped body and paint. */
function ensurePlayerCarImageCache() {
    if (cachedPlayerCarImages.length != 4 ||
        currentCarBodyIndex != equippedBodyTier ||
        cachedPlayerCarPaintRevision != playerPaintRevision) {
        rebuildPlayerCarImageCache()
    }
}

/** Creates a customized image for Garage previews without changing renderer state. */
function playerCarPreviewImage(bodyIndex: number, direction: CarImageDirection) {
    if (bodyIndex == equippedBodyTier) {
        ensurePlayerCarImageCache()
        return cachedPlayerCarImages[direction]
    }

    return renderCustomizedCarImage(bodyIndex, direction)
}

/** Creates the visible car image that follows the hidden collision sprite. */
function createPlayerRendering(direction: CarImageDirection) {
    currentCarImageDirection = direction
    ensurePlayerCarImageCache()
    renderedCarBodyIndex = currentCarBodyIndex
    renderedCarImageDirection = currentCarImageDirection
    renderedCarPaintRevision = playerPaintRevision

    playerCarVisual = sprites.create(cachedPlayerCarImages[currentCarImageDirection], SpriteKind.PlayerVisual)
    playerCarVisual.setFlag(SpriteFlag.Ghost, true)
    playerCarVisual.z = player.z + 1
}

/** Immediately sets the stopped car's facing direction and visible image. */
function setPlayerCarFacingDirection(direction: CarImageDirection) {
    currentCarImageDirection = direction
    ensurePlayerCarImageCache()

    if (playerCarVisual) {
        playerCarVisual.setImage(cachedPlayerCarImages[direction])
        renderedCarBodyIndex = currentCarBodyIndex
        renderedCarImageDirection = direction
        renderedCarPaintRevision = playerPaintRevision
    }
}

/** Destroys the visible half of the player car. */
function destroyPlayerRendering() {
    playerCarVisual.destroy()
    playerCarVisual = null
}

/**
 * Synchronizes the visible car with the hidden collision sprite.
 * It selects the equipped body and faces the strongest velocity axis unless
 * the car is reversing.
 */
function updatePlayerCarImage() {
    ensurePlayerCarImageCache()

    // Reversing changes velocity but not the direction the car is facing.
    if (!playerReversing) {
        if (Math.abs(player.vx) > Math.abs(player.vy)) {
            if (player.vx > 1) {
                currentCarImageDirection = CarImageDirection.Right
            } else if (player.vx < -1) {
                currentCarImageDirection = CarImageDirection.Left
            }
        } else {
            if (player.vy > 1) {
                currentCarImageDirection = CarImageDirection.Down
            } else if (player.vy < -1) {
                currentCarImageDirection = CarImageDirection.Up
            }
        }
    }

    if (renderedCarBodyIndex != currentCarBodyIndex ||
        renderedCarImageDirection != currentCarImageDirection ||
        renderedCarPaintRevision != playerPaintRevision) {
        playerCarVisual.setImage(cachedPlayerCarImages[currentCarImageDirection])
        renderedCarBodyIndex = currentCarBodyIndex
        renderedCarImageDirection = currentCarImageDirection
        renderedCarPaintRevision = playerPaintRevision
    }

    playerCarVisual.setPosition(player.x, player.y)
}

function playerCarFacingX() {
    if (currentCarImageDirection == CarImageDirection.Right) {
        return 1
    } else if (currentCarImageDirection == CarImageDirection.Left) {
        return -1
    }
    return 0
}

function playerCarFacingY() {
    if (currentCarImageDirection == CarImageDirection.Down) {
        return 1
    } else if (currentCarImageDirection == CarImageDirection.Up) {
        return -1
    }
    return 0
}
