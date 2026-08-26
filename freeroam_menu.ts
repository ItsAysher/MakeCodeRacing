// Full-screen Free Roam menu and generated-world map display

enum FreeRoamMenuPage {
    Options,
    Map
}

let freeRoamMenuOpen = false
let freeRoamMenuPage = FreeRoamMenuPage.Options
let freeRoamMenuSelection = 0
let freeRoamMenuMapImage: Image = null
let freeRoamMenuPlayerMapX = 0
let freeRoamMenuPlayerMapY = 0
let freeRoamMenuHomeDeltaX = 0
let freeRoamMenuHomeDeltaY = 0
let freeRoamMenuCoordinateText = "(0,0)"

/** Prints one centered line on the fixed 160-pixel-wide Arcade screen. */
function printCenteredOnFreeRoamMenu(
    target: Image,
    text: string,
    top: number,
    color: number,
    font: image.Font
) {
    let left = (target.width - text.length * font.charWidth) >> 1
    target.print(text, left, top, color, font)
}

/** Draws one selectable row on the Free Roam menu. */
function drawFreeRoamMenuOption(
    target: Image,
    text: string,
    top: number,
    selected: boolean
) {
    let left = 15
    let width = 130
    let height = 23
    let backgroundColor = selected ? 9 : 1
    let borderColor = selected ? 10 : 13
    let textColor = selected ? 1 : 15

    target.fillRect(left, top, width, height, backgroundColor)
    target.drawRect(left, top, width, height, borderColor)
    printCenteredOnFreeRoamMenu(
        target,
        text,
        top + 8,
        textColor,
        image.font5
    )
}

/** Redraws the two-option menu after a selection change. */
function drawFreeRoamMenuOptions() {
    let menuImage = image.create(160, 120)
    menuImage.fill(12)
    menuImage.fillRect(5, 5, 150, 110, 1)
    menuImage.drawRect(5, 5, 150, 110, 13)
    menuImage.drawRect(7, 7, 146, 106, 15)

    printCenteredOnFreeRoamMenu(
        menuImage,
        freeRoamThemeName() + " FREE ROAM",
        16,
        10,
        image.font8
    )
    drawFreeRoamMenuOption(
        menuImage,
        "Display Map",
        40,
        freeRoamMenuSelection == 0
    )
    drawFreeRoamMenuOption(
        menuImage,
        "Exit Freeroam",
        70,
        freeRoamMenuSelection == 1
    )
    printCenteredOnFreeRoamMenu(
        menuImage,
        "A:SELECT B:BACK M:CLOSE",
        103,
        6,
        image.font5
    )
    scene.setBackgroundImage(menuImage)
}

/** Nearest-neighbor scaling keeps the generated map's pixel art crisp. */
function drawScaledFreeRoamMap(
    target: Image,
    source: Image,
    left: number,
    top: number,
    width: number,
    height: number
) {
    for (let targetY = 0; targetY < height; targetY++) {
        let sourceY = Math.idiv(targetY * source.height, height)

        for (let targetX = 0; targetX < width; targetX++) {
            let sourceX = Math.idiv(targetX * source.width, width)
            target.setPixel(
                left + targetX,
                top + targetY,
                source.getPixel(sourceX, sourceY)
            )
        }
    }
}

/**
 * Draws a small arrow beside the player marker. Its point faces the authored
 * home chunk, even after the rolling physical tile window has been rebased.
 */
function drawFreeRoamHomeArrow(
    target: Image,
    playerX: number,
    playerY: number
) {
    let directionX = 0
    let directionY = 0
    let horizontalDistance = Math.abs(freeRoamMenuHomeDeltaX)
    let verticalDistance = Math.abs(freeRoamMenuHomeDeltaY)

    if (horizontalDistance == 0 && verticalDistance == 0) {
        // There is no meaningful arrow direction while the player is home.
        target.print("HOME", playerX + 5, playerY - 3, 10, image.font5)
        return
    }

    if (horizontalDistance * 2 >= verticalDistance) {
        directionX = freeRoamMenuHomeDeltaX > 0 ? 1 : -1
    }
    if (verticalDistance * 2 >= horizontalDistance) {
        directionY = freeRoamMenuHomeDeltaY > 0 ? 1 : -1
    }

    let arrowTailX = playerX + directionX * 6
    let arrowTailY = playerY + directionY * 6
    let arrowHeadX = playerX + directionX * 11
    let arrowHeadY = playerY + directionY * 11
    let arrowBaseX = arrowHeadX - directionX * 3
    let arrowBaseY = arrowHeadY - directionY * 3
    let perpendicularX = -directionY
    let perpendicularY = directionX

    target.drawLine(
        arrowTailX,
        arrowTailY,
        arrowHeadX,
        arrowHeadY,
        10
    )
    target.drawLine(
        arrowHeadX,
        arrowHeadY,
        arrowBaseX + perpendicularX * 2,
        arrowBaseY + perpendicularY * 2,
        10
    )
    target.drawLine(
        arrowHeadX,
        arrowHeadY,
        arrowBaseX - perpendicularX * 2,
        arrowBaseY - perpendicularY * 2,
        10
    )
}

/** Draws the complete active generated tile window on a 160x120 screen. */
function drawFreeRoamMapScreen() {
    let mapScreen = image.create(160, 120)
    mapScreen.fill(1)

    if (!freeRoamMenuMapImage) {
        printCenteredOnFreeRoamMenu(
            mapScreen,
            "MAP UNAVAILABLE",
            54,
            2,
            image.font8
        )
        scene.setBackgroundImage(mapScreen)
        return
    }

    // Reserve separate header and footer rows so neither one hides generated
    // edge tiles. A 24x24 window renders as a large 100x100 map.
    let maximumMapWidth = 150
    let maximumMapHeight = 100
    let displayWidth = maximumMapWidth
    let displayHeight = Math.idiv(
        freeRoamMenuMapImage.height * displayWidth,
        freeRoamMenuMapImage.width
    )

    if (displayHeight > maximumMapHeight) {
        displayHeight = maximumMapHeight
        displayWidth = Math.idiv(
            freeRoamMenuMapImage.width * displayHeight,
            freeRoamMenuMapImage.height
        )
    }

    let mapLeft = (160 - displayWidth) >> 1
    let mapTop = (120 - displayHeight) >> 1
    mapScreen.fillRect(
        mapLeft - 2,
        mapTop - 2,
        displayWidth + 4,
        displayHeight + 4,
        15
    )
    drawScaledFreeRoamMap(
        mapScreen,
        freeRoamMenuMapImage,
        mapLeft,
        mapTop,
        displayWidth,
        displayHeight
    )

    let markerX = mapLeft + Math.idiv(
        freeRoamMenuPlayerMapX * displayWidth,
        freeRoamMenuMapImage.width
    )
    let markerY = mapTop + Math.idiv(
        freeRoamMenuPlayerMapY * displayHeight,
        freeRoamMenuMapImage.height
    )

    // High-contrast player marker: white border with a red center.
    mapScreen.fillRect(markerX - 3, markerY - 3, 7, 7, 15)
    mapScreen.fillRect(markerX - 2, markerY - 2, 5, 5, 2)
    mapScreen.setPixel(markerX, markerY, 10)
    drawFreeRoamHomeArrow(mapScreen, markerX, markerY)

    mapScreen.fillRect(0, 0, 160, 9, 1)
    mapScreen.fillRect(0, 111, 160, 9, 1)
    printCenteredOnFreeRoamMenu(
        mapScreen,
        "COORDINATES " + freeRoamMenuCoordinateText,
        2,
        10,
        image.font5
    )
    printCenteredOnFreeRoamMenu(
        mapScreen,
        "RED:YOU ARROW:HOME B:BACK",
        113,
        10,
        image.font5
    )
    scene.setBackgroundImage(mapScreen)
}

/** Captures the active physical tile window before the pause scene is pushed. */
function captureFreeRoamMap() {
    let generatedMap = minimap.minimap(MinimapScale.Quarter, 0, 0)
    freeRoamMenuMapImage = minimap.getImage(generatedMap)
    freeRoamMenuPlayerMapX = player.x >> MinimapScale.Quarter
    freeRoamMenuPlayerMapY = player.y >> MinimapScale.Quarter
    freeRoamMenuHomeDeltaX = freeRoamHomeWorldTileX() -
        freeRoamPlayerWorldTileX()
    freeRoamMenuHomeDeltaY = freeRoamHomeWorldTileY() -
        freeRoamPlayerWorldTileY()
    freeRoamMenuCoordinateText = freeRoamPlayerCoordinateText()
}

/** Returns to driving without changing or regenerating the active world. */
function closeFreeRoamMenu() {
    if (!freeRoamMenuOpen) {
        return
    }

    freeRoamMenuOpen = false
    freeRoamMenuMapImage = null
    game.popScene()
}

/** Leaves Free Roam only after its pause scene has been removed. */
function exitFreeRoamFromMenu() {
    closeFreeRoamMenu()
    leaveCurrentDrivingSession()
    openGarage(startSelectedDrivingMode)
}

/** Installs one set of controls in the temporary pause scene. */
function bindFreeRoamMenuControls() {
    controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
        if (freeRoamMenuPage == FreeRoamMenuPage.Options) {
            freeRoamMenuSelection = 0
            drawFreeRoamMenuOptions()
        }
    })
    controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
        if (freeRoamMenuPage == FreeRoamMenuPage.Options) {
            freeRoamMenuSelection = 1
            drawFreeRoamMenuOptions()
        }
    })
    controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
        if (freeRoamMenuPage == FreeRoamMenuPage.Map) {
            freeRoamMenuPage = FreeRoamMenuPage.Options
            drawFreeRoamMenuOptions()
        } else if (freeRoamMenuSelection == 0) {
            freeRoamMenuPage = FreeRoamMenuPage.Map
            drawFreeRoamMapScreen()
        } else {
            exitFreeRoamFromMenu()
        }
    })
    controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
        if (freeRoamMenuPage == FreeRoamMenuPage.Map) {
            freeRoamMenuPage = FreeRoamMenuPage.Options
            drawFreeRoamMenuOptions()
        } else {
            closeFreeRoamMenu()
        }
    })
    controller.menu.onEvent(ControllerButtonEvent.Pressed, function () {
        closeFreeRoamMenu()
    })
}

/** Opens the pause menu only while a live Free Roam session is active. */
function openFreeRoamMenu() {
    if (freeRoamMenuOpen ||
        drivingSessionState != DrivingSessionState.FreeRoam ||
        !player) {
        return
    }

    freeRoamMenuOpen = true
    freeRoamMenuPage = FreeRoamMenuPage.Options
    freeRoamMenuSelection = 0
    captureFreeRoamMap()
    game.pushScene()
    bindFreeRoamMenuControls()
    drawFreeRoamMenuOptions()
}

// Preserve the simulator's other defaults while moving Menu from ` to M.
keymap.setSystemKeys(
    keymap.KeyCode.P,
    keymap.KeyCode.R,
    keymap.KeyCode.M,
    keymap.KeyCode.Backspace
)

// onEvent replaces Arcade's built-in system-menu handler for this button.
// Outside Free Roam, explicitly preserve the ordinary system menu behavior.
controller.menu.onEvent(ControllerButtonEvent.Pressed, function () {
    if (drivingSessionState == DrivingSessionState.FreeRoam) {
        openFreeRoamMenu()
    } else {
        scene.systemMenu.showSystemMenu()
    }
})
