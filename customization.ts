// Player paint ownership, equipped colors, and color replacement

enum CarPaintPart {
    Primary,
    Secondary,
    Accent
}

let paintPrice = 300
let paintColorNames = [
    "White",
    "Red",
    "Pink",
    "Orange",
    "Yellow",
    "Teal",
    "Green",
    "Blue",
    "Light Blue",
    "Purple",
    "Lavender",
    "Dark Purple",
    "Tan",
    "Brown",
    "Black"
]
let paintColorValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

// The starter scheme is white, teal, and blue. A purchased paint can be used
// on any of the three paint parts without buying it again.
let paintColorsUnlocked = [
    true, false, false, false, false,
    true, false, true, false, false,
    false, false, false, false, false
]
let equippedPrimaryColor = 8
let equippedSecondaryColor = 6
let equippedAccentColor = 1
let playerPaintRevision = 0

// Each authored layer has one replaceable source color for each body tier.
let primarySourceColors = [8, 10, 2]
let secondarySourceColors = [6, 12, 12]
let accentSourceColors = [1, 5, 1]

function paintColorName(colorValue: number) {
    for (let index = 0; index < paintColorValues.length; index++) {
        if (paintColorValues[index] == colorValue) {
            return paintColorNames[index]
        }
    }
    return "Unknown"
}

function equippedColorForPart(part: CarPaintPart) {
    if (part == CarPaintPart.Primary) {
        return equippedPrimaryColor
    } else if (part == CarPaintPart.Secondary) {
        return equippedSecondaryColor
    }
    return equippedAccentColor
}

function sourceColorForPart(bodyIndex: number, part: CarPaintPart) {
    if (part == CarPaintPart.Primary) {
        return primarySourceColors[bodyIndex]
    } else if (part == CarPaintPart.Secondary) {
        return secondarySourceColors[bodyIndex]
    }
    return accentSourceColors[bodyIndex]
}

/** Draws one recolored car-part layer onto a rendered car image. */
function drawCustomizedCarPart(
    renderedImage: Image,
    partImage: Image,
    bodyIndex: number,
    part: CarPaintPart
) {
    let customizedPart = partImage.clone()
    customizedPart.replace(
        sourceColorForPart(bodyIndex, part),
        equippedColorForPart(part)
    )
    renderedImage.drawTransparentImage(customizedPart, 0, 0)
}

/** Equips a purchased color and marks rendered player images as stale. */
function equipPlayerPaint(part: CarPaintPart, colorValue: number) {
    if (part == CarPaintPart.Primary) {
        equippedPrimaryColor = colorValue
    } else if (part == CarPaintPart.Secondary) {
        equippedSecondaryColor = colorValue
    } else {
        equippedAccentColor = colorValue
    }
    playerPaintRevision += 1
}
