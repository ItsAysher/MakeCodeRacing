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
let freeRoamMenuWindowWorldTileLeft = 0
let freeRoamMenuWindowWorldTileTop = 0

enum RacePauseMenuPage {
    Options,
    Controls,
    Settings,
    ConfirmRestart,
    ConfirmGarage
}

let racePauseMenuOpen = false
let racePauseMenuPage = RacePauseMenuPage.Options
let racePauseMenuSelection = 0
let racePauseSettingsPage = 0
let racePauseSettingsSelection = 0
let racePauseConfirmSelection = 1
let racePauseRestartCountdownOnClose = false

/** Prints one centered line on the fixed 160-pixel-wide Arcade screen. */
function printCenteredOnFreeRoamMenu(
    target: Image,
    text: string,
    top: number,
    color: number,
    font: image.Font
) {
    let fittedText = fitArcadeText(text, target.width - 8, font)
    target.print(
        fittedText,
        centeredArcadeTextX(target.width, fittedText, font),
        top,
        color,
        font
    )
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
    let fittedText = fitArcadeText(text, width - 6, image.font5)
    target.print(
        fittedText,
        left + centeredArcadeTextX(width, fittedText, image.font5),
        top + 8,
        textColor,
        image.font5
    )
}

/** Redraws the branded Free Roam menu after a selection change. */
function drawFreeRoamMenuOptions() {
    let menuImage = image.create(160, 120)
    menuImage.fill(12)
    menuImage.fillRect(5, 5, 150, 110, 1)
    menuImage.drawRect(5, 5, 150, 110, 13)
    menuImage.drawRect(7, 7, 146, 106, 15)

    printCenteredOnFreeRoamMenu(
        menuImage,
        freeRoamThemeName() + " FREE ROAM",
        12,
        10,
        image.font8
    )
    drawFreeRoamMenuOption(
        menuImage,
        "Display Map",
        31,
        freeRoamMenuSelection == 0
    )
    drawFreeRoamMenuOption(
        menuImage,
        "Ability: " + freeRoamAbilityName(selectedFreeRoamAbility),
        57,
        freeRoamMenuSelection == 1
    )
    drawFreeRoamMenuOption(
        menuImage,
        "Exit Free Roam",
        83,
        freeRoamMenuSelection == 2
    )
    printCenteredOnFreeRoamMenu(
        menuImage,
        "A:SELECT B:BACK MENU:CLOSE",
        108,
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

/** Draws one numbered arrow toward a discovered activity outside the map. */
function drawFreeRoamActivityArrow(
    target: Image,
    playerX: number,
    playerY: number,
    deltaX: number,
    deltaY: number,
    activityIndex: number,
    color: number
) {
    let directionX = 0
    let directionY = 0
    let horizontalDistance = Math.abs(deltaX)
    let verticalDistance = Math.abs(deltaY)
    if (horizontalDistance == 0 && verticalDistance == 0) {
        return
    }

    if (horizontalDistance * 2 >= verticalDistance) {
        directionX = deltaX > 0 ? 1 : -1
    }
    if (verticalDistance * 2 >= horizontalDistance) {
        directionY = deltaY > 0 ? 1 : -1
    }

    // Concentric distances keep up to three arrows legible even when several
    // discovered activities lie in the same general direction.
    let tailDistance = 13 + activityIndex * 7
    let headDistance = tailDistance + 5
    let arrowTailX = playerX + directionX * tailDistance
    let arrowTailY = playerY + directionY * tailDistance
    let arrowHeadX = playerX + directionX * headDistance
    let arrowHeadY = playerY + directionY * headDistance
    let arrowBaseX = arrowHeadX - directionX * 3
    let arrowBaseY = arrowHeadY - directionY * 3
    let perpendicularX = -directionY
    let perpendicularY = directionX

    target.drawLine(
        arrowTailX, arrowTailY, arrowHeadX, arrowHeadY, color
    )
    target.drawLine(
        arrowHeadX,
        arrowHeadY,
        arrowBaseX + perpendicularX * 2,
        arrowBaseY + perpendicularY * 2,
        color
    )
    target.drawLine(
        arrowHeadX,
        arrowHeadY,
        arrowBaseX - perpendicularX * 2,
        arrowBaseY - perpendicularY * 2,
        color
    )
    target.print(
        "" + (activityIndex + 1),
        arrowHeadX + perpendicularX * 4 - 2,
        arrowHeadY + perpendicularY * 4 - 2,
        color,
        image.font5
    )
}

/** Draws loaded activity markers and off-window arrows for discovered sites. */
function drawFreeRoamMapActivities(
    target: Image,
    mapLeft: number,
    mapTop: number,
    displayWidth: number,
    displayHeight: number,
    playerMarkerX: number,
    playerMarkerY: number
) {
    let discoveredMask = freeRoamMapActivityDiscoveredMask(
        selectedFreeRoamTheme
    )
    let activityColor = freeRoamMapActivityColor(selectedFreeRoamTheme)
    let playerWorldTileX = freeRoamPlayerWorldTileX()
    let playerWorldTileY = freeRoamPlayerWorldTileY()

    for (let activityIndex = 0;
        activityIndex < freeRoamMapActivityCount;
        activityIndex++) {
        let activityBit = 1 << activityIndex
        if (!(discoveredMask & activityBit) ||
            !freeRoamMapActivityIsAvailable(
                selectedFreeRoamTheme, activityIndex
            )) {
            continue
        }

        let worldTileX = freeRoamMapActivityWorldTileX(
            selectedFreeRoamTheme, activityIndex
        )
        let worldTileY = freeRoamMapActivityWorldTileY(
            selectedFreeRoamTheme, activityIndex
        )
        let physicalTileX = worldTileX - freeRoamMenuWindowWorldTileLeft
        let physicalTileY = worldTileY - freeRoamMenuWindowWorldTileTop
        let activityIsOnMap = physicalTileX >= 0 &&
            physicalTileX < freeRoamWindowTileSize &&
            physicalTileY >= 0 &&
            physicalTileY < freeRoamWindowTileSize

        if (activityIsOnMap) {
            let sourceMapX = (physicalTileX * freeRoamTileSize +
                freeRoamTileSize / 2) >> 2
            let sourceMapY = (physicalTileY * freeRoamTileSize +
                freeRoamTileSize / 2) >> 2
            let markerX = mapLeft + Math.idiv(
                sourceMapX * displayWidth,
                freeRoamMenuMapImage.width
            )
            let markerY = mapTop + Math.idiv(
                sourceMapY * displayHeight,
                freeRoamMenuMapImage.height
            )
            target.fillRect(markerX - 3, markerY - 3, 7, 7, 15)
            target.fillRect(
                markerX - 2, markerY - 2, 5, 5, activityColor
            )
            target.setPixel(markerX, markerY, 15)
            target.print(
                "" + (activityIndex + 1),
                markerX + 4,
                markerY - 2,
                activityColor,
                image.font5
            )
        } else {
            drawFreeRoamActivityArrow(
                target,
                playerMarkerX,
                playerMarkerY,
                worldTileX - playerWorldTileX,
                worldTileY - playerWorldTileY,
                activityIndex,
                activityColor
            )
        }
    }
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

    drawFreeRoamMapActivities(
        mapScreen,
        mapLeft,
        mapTop,
        displayWidth,
        displayHeight,
        markerX,
        markerY
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
        "R:YOU HOME " +
            freeRoamMapActivityLegend(selectedFreeRoamTheme) +
            " B:BACK",
        113,
        10,
        image.font5
    )
    scene.setBackgroundImage(mapScreen)
}

/** Captures the active physical tile window before the pause scene is pushed. */
function captureFreeRoamMap() {
    freeRoamMenuMapImage = createNativeMinimapImage(2)
    freeRoamMenuPlayerMapX = player.x >> 2
    freeRoamMenuPlayerMapY = player.y >> 2
    freeRoamMenuHomeDeltaX = freeRoamHomeWorldTileX() -
        freeRoamPlayerWorldTileX()
    freeRoamMenuHomeDeltaY = freeRoamHomeWorldTileY() -
        freeRoamPlayerWorldTileY()
    freeRoamMenuCoordinateText = freeRoamPlayerCoordinateText()

    if (selectedFreeRoamTheme == FreeRoamTheme.Forest) {
        freeRoamMenuWindowWorldTileLeft =
            (forestFreeRoamCenterSectionX() - 1) *
            freeRoamSectionSize
        freeRoamMenuWindowWorldTileTop =
            (forestFreeRoamCenterSectionY() - 1) *
            freeRoamSectionSize
    } else if (selectedFreeRoamTheme == FreeRoamTheme.Highway) {
        freeRoamMenuWindowWorldTileLeft =
            highwayFreeRoamWindowWorldTileLeft()
        freeRoamMenuWindowWorldTileTop =
            highwayFreeRoamWindowWorldTileTop()
    } else {
        freeRoamMenuWindowWorldTileLeft =
            (caveFreeRoamCenterWorldSectionX() - 1) *
            freeRoamSectionSize
        freeRoamMenuWindowWorldTileTop =
            (caveFreeRoamCenterWorldSectionY() - 1) *
            freeRoamSectionSize
    }
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
            freeRoamMenuSelection =
                (freeRoamMenuSelection + 2) % 3
            drawFreeRoamMenuOptions()
        }
    })
    controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
        if (freeRoamMenuPage == FreeRoamMenuPage.Options) {
            freeRoamMenuSelection =
                (freeRoamMenuSelection + 1) % 3
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
        } else if (freeRoamMenuSelection == 1) {
            cycleSelectedFreeRoamAbility()
            drawFreeRoamMenuOptions()
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

/** Draws one compact selectable row on the race pause screen. */
function drawRacePauseOption(
    target: Image,
    text: string,
    top: number,
    selected: boolean
) {
    let left = 18
    let width = 124
    let height = 14
    let backgroundColor = selected ? 9 : 1
    let borderColor = selected ? 10 : 13
    let textColor = selected ? 1 : 15

    target.fillRect(left, top, width, height, backgroundColor)
    target.drawRect(left, top, width, height, borderColor)
    let fittedText = fitArcadeText(text, width - 6, image.font5)
    target.print(
        fittedText,
        left + centeredArcadeTextX(width, fittedText, image.font5),
        top + 5,
        textColor,
        image.font5
    )
}

/** Shared race pause panel treatment used by every submenu. */
function createRacePausePanel(title: string) {
    let menuImage = image.create(160, 120)
    menuImage.fill(12)
    menuImage.fillRect(5, 5, 150, 110, 1)
    menuImage.drawRect(5, 5, 150, 110, 13)
    menuImage.drawRect(7, 7, 146, 106, 15)
    printCenteredOnFreeRoamMenu(
        menuImage,
        title,
        11,
        10,
        image.font8
    )
    return menuImage
}

/** Draws the main pause actions without invoking the system menu. */
function drawRacePauseOptions() {
    let menuImage = createRacePausePanel("RACE PAUSED")
    let options = [
        "Resume",
        "Restart Race",
        "Controls",
        "Settings",
        "Return to Garage"
    ]

    for (let index = 0; index < options.length; index++) {
        drawRacePauseOption(
            menuImage,
            options[index],
            27 + index * 17,
            racePauseMenuSelection == index
        )
    }
    printCenteredOnFreeRoamMenu(
        menuImage,
        "A:SELECT B:RESUME MENU:RESUME",
        113,
        6,
        image.font5
    )
    scene.setBackgroundImage(menuImage)
}

/** Draws concise driving help while keeping the active race suspended. */
function drawRacePauseControls() {
    let menuImage = createRacePausePanel("DRIVING CONTROLS")
    let lines = [
        "D-PAD  DRIVE + STEER",
        "OPPOSITE  BRAKE/REVERSE",
        "A BUTTON  HARD BRAKE",
        "MENU  PAUSE",
        "PASS CHECKPOINT BEFORE FINISH"
    ]

    for (let index = 0; index < lines.length; index++) {
        printCenteredOnFreeRoamMenu(
            menuImage,
            lines[index],
            31 + index * 13,
            index == 4 ? 7 : 15,
            image.font5
        )
    }
    printCenteredOnFreeRoamMenu(
        menuImage,
        "A/B:BACK",
        103,
        10,
        image.font8
    )
    scene.setBackgroundImage(menuImage)
}

/** Draws pause-safe settings without nesting storytelling menus. */
function drawRacePauseSettings() {
    let menuImage = createRacePausePanel("RACE SETTINGS")
    let options: string[] = []

    if (racePauseSettingsPage == 0) {
        options = [
            "Sound: " + racingSettingState(racingSoundEnabled),
            "Camera Shake: " +
                racingSettingState(racingCameraShakeEnabled),
            "More",
            "Back"
        ]
    } else if (racePauseSettingsPage == 1) {
        options = [
            "High Contrast: " +
                racingSettingState(racingHighContrastHud),
            "Driving FX: " +
                racingSettingState(racingDrivingEffectsEnabled),
            "More",
            "Back"
        ]
    } else if (racePauseSettingsPage == 2) {
        options = [
            "Difficulty: " +
                drivingDifficultyPresetName(
                    racingDrivingDifficultyPreset
                ),
            "Steering Assist: " +
                racingSettingState(racingSteeringAssistEnabled),
            "More",
            "Back"
        ]
    } else {
        options = [
            "Brake Assist: " +
                racingSettingState(racingBrakingAssistEnabled),
            "Assist Guide",
            "More",
            "Back"
        ]
    }

    for (let index = 0; index < options.length; index++) {
        drawRacePauseOption(
            menuImage,
            options[index],
            30 + index * 18,
            racePauseSettingsSelection == index
        )
    }
    printCenteredOnFreeRoamMenu(
        menuImage,
        "A:SELECT B:BACK  PAGE " +
            (racePauseSettingsPage + 1) + "/4",
        110,
        6,
        image.font5
    )
    scene.setBackgroundImage(menuImage)
}

/** Requires an intentional confirmation before abandoning race progress. */
function drawRacePauseConfirmation(garage: boolean) {
    let title = garage ? "RETURN TO GARAGE?" : "RESTART RACE?"
    let menuImage = createRacePausePanel(title)
    printCenteredOnFreeRoamMenu(
        menuImage,
        garage ? "RACE PROGRESS WILL BE LOST" :
            "START AGAIN FROM THE GRID",
        40,
        7,
        image.font5
    )
    drawRacePauseOption(
        menuImage,
        garage ? "Return to Garage" : "Restart Race",
        61,
        racePauseConfirmSelection == 0
    )
    drawRacePauseOption(
        menuImage,
        "Cancel",
        80,
        racePauseConfirmSelection == 1
    )
    printCenteredOnFreeRoamMenu(
        menuImage,
        "A:SELECT B:CANCEL",
        105,
        6,
        image.font5
    )
    scene.setBackgroundImage(menuImage)
}

/** Redraws whichever race pause page is currently active. */
function drawCurrentRacePausePage() {
    if (racePauseMenuPage == RacePauseMenuPage.Controls) {
        drawRacePauseControls()
    } else if (racePauseMenuPage == RacePauseMenuPage.Settings) {
        drawRacePauseSettings()
    } else if (racePauseMenuPage == RacePauseMenuPage.ConfirmRestart) {
        drawRacePauseConfirmation(false)
    } else if (racePauseMenuPage == RacePauseMenuPage.ConfirmGarage) {
        drawRacePauseConfirmation(true)
    } else {
        drawRacePauseOptions()
    }
}

/** Returns from a race pause submenu to its main action list. */
function returnToRacePauseOptions() {
    racePauseMenuPage = RacePauseMenuPage.Options
    drawRacePauseOptions()
}

/** Resumes gameplay and safely restarts a paused grid countdown if needed. */
function closeRacePauseMenu() {
    if (!racePauseMenuOpen) {
        return
    }

    let restartCountdown = racePauseRestartCountdownOnClose
    racePauseMenuOpen = false
    racePauseRestartCountdownOnClose = false
    game.popScene()
    refreshPolishHudColors()

    if (restartCountdown &&
        drivingSessionState == DrivingSessionState.RaceStarting) {
        // Let the invalidated countdown fiber observe its new session ID and
        // exit before it could clear the fresh countdown's first frame.
        let resumedSessionId = raceSessionId
        control.runInParallel(function () {
            pause(700)
            if (!racePauseMenuOpen &&
                raceSessionId == resumedSessionId &&
                drivingSessionState == DrivingSessionState.RaceStarting) {
                runRaceStartCountdown(resumedSessionId)
            }
        })
    }
}

/** Restarts the selected event after removing the temporary pause scene. */
function restartRaceFromPauseMenu() {
    racePauseRestartCountdownOnClose = false
    racePauseMenuOpen = false
    game.popScene()
    leaveCurrentDrivingSession()
    startNextRace()
}

/** Leaves the current event and opens the normal Garage flow. */
function returnToGarageFromRacePauseMenu() {
    racePauseRestartCountdownOnClose = false
    racePauseMenuOpen = false
    game.popScene()
    leaveCurrentDrivingSession()
    openGarage(startSelectedDrivingMode)
}

/** Handles an A press for the current race pause page. */
function selectRacePauseOption() {
    if (racePauseMenuPage == RacePauseMenuPage.Controls) {
        returnToRacePauseOptions()
    } else if (racePauseMenuPage == RacePauseMenuPage.Settings) {
        if (racePauseSettingsSelection == 2) {
            racePauseSettingsPage = (racePauseSettingsPage + 1) % 4
            racePauseSettingsSelection = 0
        } else if (racePauseSettingsSelection == 3) {
            returnToRacePauseOptions()
            return
        } else if (racePauseSettingsPage == 0) {
            if (racePauseSettingsSelection == 0) {
                racingSoundEnabled = !racingSoundEnabled
            } else {
                racingCameraShakeEnabled = !racingCameraShakeEnabled
            }
            saveRacingSettings()
        } else if (racePauseSettingsPage == 1) {
            if (racePauseSettingsSelection == 0) {
                racingHighContrastHud = !racingHighContrastHud
            } else {
                racingDrivingEffectsEnabled =
                    !racingDrivingEffectsEnabled
                if (!racingDrivingEffectsEnabled) {
                    clearDrivingEffects()
                }
            }
            saveRacingSettings()
        } else if (racePauseSettingsPage == 2) {
            if (racePauseSettingsSelection == 0) {
                cycleDrivingDifficultyPreset()
            } else {
                racingSteeringAssistEnabled =
                    !racingSteeringAssistEnabled
                saveRacingSettings()
            }
        } else {
            if (racePauseSettingsSelection == 0) {
                racingBrakingAssistEnabled =
                    !racingBrakingAssistEnabled
                saveRacingSettings()
            } else {
                game.showLongText(
                    "Steering assist strengthens only your requested turn. " +
                        "Brake assist trims only excess corner speed. " +
                        "Neither assist drives or stops the car for you.",
                    DialogLayout.Full
                )
            }
        }
        drawRacePauseSettings()
    } else if (racePauseMenuPage == RacePauseMenuPage.ConfirmRestart ||
        racePauseMenuPage == RacePauseMenuPage.ConfirmGarage) {
        if (racePauseConfirmSelection == 1) {
            returnToRacePauseOptions()
        } else if (racePauseMenuPage ==
            RacePauseMenuPage.ConfirmRestart) {
            restartRaceFromPauseMenu()
        } else {
            returnToGarageFromRacePauseMenu()
        }
    } else if (racePauseMenuSelection == 0) {
        closeRacePauseMenu()
    } else if (racePauseMenuSelection == 1) {
        racePauseMenuPage = RacePauseMenuPage.ConfirmRestart
        racePauseConfirmSelection = 1
        drawCurrentRacePausePage()
    } else if (racePauseMenuSelection == 2) {
        racePauseMenuPage = RacePauseMenuPage.Controls
        drawRacePauseControls()
    } else if (racePauseMenuSelection == 3) {
        racePauseMenuPage = RacePauseMenuPage.Settings
        racePauseSettingsPage = 0
        racePauseSettingsSelection = 0
        drawRacePauseSettings()
    } else {
        racePauseMenuPage = RacePauseMenuPage.ConfirmGarage
        racePauseConfirmSelection = 1
        drawCurrentRacePausePage()
    }
}

/** Installs controller-native controls in the temporary race pause scene. */
function bindRacePauseMenuControls() {
    controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
        if (racePauseMenuPage == RacePauseMenuPage.Options) {
            racePauseMenuSelection = (racePauseMenuSelection + 4) % 5
        } else if (racePauseMenuPage == RacePauseMenuPage.Settings) {
            racePauseSettingsSelection =
                (racePauseSettingsSelection + 3) % 4
        } else if (racePauseMenuPage ==
            RacePauseMenuPage.ConfirmRestart ||
            racePauseMenuPage == RacePauseMenuPage.ConfirmGarage) {
            racePauseConfirmSelection =
                (racePauseConfirmSelection + 1) % 2
        }
        drawCurrentRacePausePage()
    })
    controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
        if (racePauseMenuPage == RacePauseMenuPage.Options) {
            racePauseMenuSelection = (racePauseMenuSelection + 1) % 5
        } else if (racePauseMenuPage == RacePauseMenuPage.Settings) {
            racePauseSettingsSelection =
                (racePauseSettingsSelection + 1) % 4
        } else if (racePauseMenuPage ==
            RacePauseMenuPage.ConfirmRestart ||
            racePauseMenuPage == RacePauseMenuPage.ConfirmGarage) {
            racePauseConfirmSelection =
                (racePauseConfirmSelection + 1) % 2
        }
        drawCurrentRacePausePage()
    })
    controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
        selectRacePauseOption()
    })
    controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
        if (racePauseMenuPage == RacePauseMenuPage.Options) {
            closeRacePauseMenu()
        } else {
            returnToRacePauseOptions()
        }
    })
    controller.menu.onEvent(ControllerButtonEvent.Pressed, function () {
        closeRacePauseMenu()
    })
}

/** Opens a dedicated pause scene during either the grid or live race. */
function openRacePauseMenu() {
    if (racePauseMenuOpen ||
        (drivingSessionState != DrivingSessionState.RaceStarting &&
            drivingSessionState != DrivingSessionState.Race)) {
        return
    }

    racePauseMenuOpen = true
    racePauseMenuPage = RacePauseMenuPage.Options
    racePauseMenuSelection = 0
    racePauseRestartCountdownOnClose =
        drivingSessionState == DrivingSessionState.RaceStarting

    if (racePauseRestartCountdownOnClose) {
        // The countdown is an independent fiber, so invalidate it before the
        // scene switch. Resume begins a fresh 3-2-1 sequence on the race scene.
        raceSessionId += 1
        clearRaceCountdownDisplay()
    }

    game.pushScene()
    bindRacePauseMenuControls()
    drawRacePauseOptions()
}

// onEvent replaces Arcade's built-in system-menu handler for this button.
// Outside Free Roam, explicitly preserve the ordinary system menu behavior.
controller.menu.onEvent(ControllerButtonEvent.Pressed, function () {
    if (drivingSessionState == DrivingSessionState.FreeRoam) {
        openFreeRoamMenu()
    } else if (drivingSessionState == DrivingSessionState.RaceStarting ||
        drivingSessionState == DrivingSessionState.Race) {
        openRacePauseMenu()
    } else {
        scene.systemMenu.showSystemMenu()
    }
})
