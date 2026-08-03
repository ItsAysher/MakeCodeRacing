// Player car appearance and directional rendering
//
// Every image array is stored in this order so direction indexes remain simple:
// up, down, left, right.
enum CarImageDirection {
    Up,
    Down,
    Left,
    Right
}

let carBody1Images = [
    assets.image`body1Up`,
    assets.image`body1Down`,
    assets.image`body1Left`,
    assets.image`body1Right`
]
let carBody2Images = [
    assets.image`body2Up`,
    assets.image`body2Down`,
    assets.image`body2Left`,
    assets.image`body2Right`
]
let carBody3Images = [
    assets.image`body3Up`,
    assets.image`body3Down`,
    assets.image`body3Left`,
    assets.image`body3Right`
]

let carBody1PrimaryImages = [
    assets.image`body1UpPrimary`,
    assets.image`body1DownPrimary`,
    assets.image`body1LeftPrimary`,
    assets.image`body1RightPrimary`
]
let carBody2PrimaryImages = [
    assets.image`body2UpPrimary`,
    assets.image`body2DownPrimary`,
    assets.image`body2LeftPrimary`,
    assets.image`body2RightPrimary`
]
let carBody3PrimaryImages = [
    assets.image`body3UpPrimary`,
    assets.image`body3DownPrimary`,
    assets.image`body3LeftPrimary`,
    assets.image`body3RightPrimary`
]

let carBody1SecondaryImages = [
    assets.image`body1UpSecondary`,
    assets.image`body1DownSecondary`,
    assets.image`body1LeftSecondary`,
    assets.image`body1RightSecondary`
]
let carBody2SecondaryImages = [
    assets.image`body2UpSecondary`,
    assets.image`body2DownSecondary`,
    assets.image`body2LeftSecondary`,
    assets.image`body2RightSecondary`
]
let carBody3SecondaryImages = [
    assets.image`body3UpSecondary`,
    assets.image`body3DownSecondary`,
    assets.image`body3LeftSecondary`,
    assets.image`body3RightSecondary`
]

let carBody1AccentImages = [
    assets.image`body1UpAccent`,
    assets.image`body1DownAccent`,
    assets.image`body1LeftAccent`,
    assets.image`body1RightAccent`
]
let carBody2AccentImages = [
    assets.image`body2UpAccent`,
    assets.image`body2DownAccent`,
    assets.image`body2LeftAccent`,
    assets.image`body2RightAccent`
]
let carBody3AccentImages = [
    assets.image`body3UpAccent`,
    assets.image`body3DownAccent`,
    assets.image`body3LeftAccent`,
    assets.image`body3RightAccent`
]

let allCarBodyImages = [
    carBody1Images,
    carBody2Images,
    carBody3Images
]
let allCarBodyPrimaryImages = [
    carBody1PrimaryImages,
    carBody2PrimaryImages,
    carBody3PrimaryImages
]
let allCarBodySecondaryImages = [
    carBody1SecondaryImages,
    carBody2SecondaryImages,
    carBody3SecondaryImages
]
let allCarBodyAccentImages = [
    carBody1AccentImages,
    carBody2AccentImages,
    carBody3AccentImages
]

let activeCarBodyImages = carBody1Images
let activeCarBodyPrimaryImages = carBody1PrimaryImages
let activeCarBodySecondaryImages = carBody1SecondaryImages
let activeCarBodyAccentImages = carBody1AccentImages
let currentCarImageDirection = CarImageDirection.Up
let currentCarBodyIndex = -1
let renderedCarImageDirection = -1
let renderedCarBodyIndex = -1
let renderedCarPaintRevision = -1
let playerCarVisual: Sprite = null

/** Selects all image layers for the equipped body. */
function selectPlayerCarBodyImages() {
    currentCarBodyIndex = equippedBodyTier
    activeCarBodyImages = allCarBodyImages[equippedBodyTier]
    activeCarBodyPrimaryImages = allCarBodyPrimaryImages[equippedBodyTier]
    activeCarBodySecondaryImages = allCarBodySecondaryImages[equippedBodyTier]
    activeCarBodyAccentImages = allCarBodyAccentImages[equippedBodyTier]
}

/**
 * Composites the base car with its primary, secondary, and accent artwork.
 * The base remains underneath so neutral details not included in a color layer
 * continue to render.
 */
function renderPlayerCarImage() {
    let renderedImage = activeCarBodyImages[currentCarImageDirection].clone()
    drawCustomizedCarPart(
        renderedImage,
        activeCarBodyPrimaryImages[currentCarImageDirection],
        currentCarBodyIndex,
        CarPaintPart.Primary
    )
    drawCustomizedCarPart(
        renderedImage,
        activeCarBodySecondaryImages[currentCarImageDirection],
        currentCarBodyIndex,
        CarPaintPart.Secondary
    )
    drawCustomizedCarPart(
        renderedImage,
        activeCarBodyAccentImages[currentCarImageDirection],
        currentCarBodyIndex,
        CarPaintPart.Accent
    )
    return renderedImage
}

/** Creates a customized image for Garage previews without changing renderer state. */
function playerCarPreviewImage(bodyIndex: number, direction: CarImageDirection) {
    let previewImage = allCarBodyImages[bodyIndex][direction].clone()
    drawCustomizedCarPart(
        previewImage,
        allCarBodyPrimaryImages[bodyIndex][direction],
        bodyIndex,
        CarPaintPart.Primary
    )
    drawCustomizedCarPart(
        previewImage,
        allCarBodySecondaryImages[bodyIndex][direction],
        bodyIndex,
        CarPaintPart.Secondary
    )
    drawCustomizedCarPart(
        previewImage,
        allCarBodyAccentImages[bodyIndex][direction],
        bodyIndex,
        CarPaintPart.Accent
    )
    return previewImage
}

/** Creates the visible car image that follows the hidden collision sprite. */
function createPlayerRendering(direction?: CarImageDirection) {
    selectPlayerCarBodyImages()
    currentCarImageDirection = direction == null ? CarImageDirection.Right : direction
    renderedCarBodyIndex = currentCarBodyIndex
    renderedCarImageDirection = currentCarImageDirection
    renderedCarPaintRevision = playerPaintRevision

    playerCarVisual = sprites.create(renderPlayerCarImage(), SpriteKind.PlayerVisual)
    playerCarVisual.setFlag(SpriteFlag.Ghost, true)
    playerCarVisual.z = player.z + 1
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
    if (equippedBodyTier != currentCarBodyIndex) {
        selectPlayerCarBodyImages()
    }

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
        playerCarVisual.setImage(renderPlayerCarImage())
        renderedCarBodyIndex = currentCarBodyIndex
        renderedCarImageDirection = currentCarImageDirection
        renderedCarPaintRevision = playerPaintRevision
    }

    playerCarVisual.setPosition(player.x, player.y)
    playerCarVisual.z = player.z + 1
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
