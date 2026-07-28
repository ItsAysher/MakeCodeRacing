enum RaceDifficulty {
    Beginner,
    Intermediate,
    Expert
}

enum DrivingMode {
    Race,
    FreeRoam
}

let selectedRace = RaceDifficulty.Beginner
let selectedDrivingMode = DrivingMode.Race
let raceInProgress = false
let freeRoamInProgress = false
let checkpointArmed = false
let raceLap = 0
let raceLapTarget = 1
let racePrize = 0
let raceTimeLimit = 0
let raceMinimap: Sprite = null

// Each difficulty has its own authored tilemap asset. The tilemaps contain all
// track, scenery, checkpoint, and finish tiles, so race.ts does not duplicate
// any tile artwork or build a map in code.
function loadSelectedRaceMap() {
    if (selectedRace == RaceDifficulty.Expert) {
        tiles.setCurrentTilemap(tilemap`expertRaceMap`)
    } else if (selectedRace == RaceDifficulty.Intermediate) {
        tiles.setCurrentTilemap(tilemap`intermediateRaceMap`)
    } else {
        tiles.setCurrentTilemap(tilemap`beginnerRaceMap`)
    }
}

function configureRaceDifficulty() {
    if (selectedRace == RaceDifficulty.Expert) {
        raceLapTarget = 3
        // Two Expert wins buy one Tier 3 part.
        racePrize = 500
        raceTimeLimit = 65
    } else if (selectedRace == RaceDifficulty.Intermediate) {
        raceLapTarget = 2
        // Five Intermediate wins buy one Tier 3 part.
        racePrize = 200
        raceTimeLimit = 55
    } else {
        raceLapTarget = 1
        // Three Beginner wins buy one Tier 2 part.
        racePrize = 100
        raceTimeLimit = 40
    }
}

function configureRaceBackground() {
    // Clear any scroller left over from another scene. The Beginner track
    // covers the full play area and intentionally has no separate background.
    scroller.setLayerImage(scroller.BackgroundLayer.Layer0, image.create(1, 1))
    scroller.scrollBackgroundWithSpeed(0, 0)

    if (selectedRace == RaceDifficulty.Beginner) {
        scene.setBackgroundColor(7)
        return
    }

    // Intermediate and Expert background assets have not been created yet.
    // Configure their scrolling layer here once those assets are available:
    //
    // scroller.setLayerImage(scroller.BackgroundLayer.Layer0, assets.image`race-background`)
    // scroller.scrollBackgroundWithCamera(scroller.CameraScrollMode.BothDirections)
    // scroller.setCameraScrollingMultipliers(0.35, 0.35)
    scene.setBackgroundColor(7)
}

function updateRaceMinimap() {
    if (!raceInProgress) {
        return
    }

    let map = minimap.minimap(MinimapScale.Eighth, 1, 1)
    minimap.includeSprite(map, playerCarVisual)

    if (!raceMinimap) {
        raceMinimap = sprites.create(minimap.getImage(map), SpriteKind.MinimapHud)
        raceMinimap.setFlag(SpriteFlag.RelativeToCamera, true)
        raceMinimap.setFlag(SpriteFlag.Ghost, true)
        raceMinimap.z = 100
        raceMinimap.right = 158
        raceMinimap.bottom = 118
    } else {
        raceMinimap.setImage(minimap.getImage(map))
        raceMinimap.setFlag(SpriteFlag.Invisible, false)
    }
}

function raceName() {
    if (selectedRace == RaceDifficulty.Expert) {
        return "EXPERT"
    } else if (selectedRace == RaceDifficulty.Intermediate) {
        return "INTERMEDIATE"
    }
    return "BEGINNER"
}

function startSelectedDrivingMode() {
    if (selectedDrivingMode == DrivingMode.FreeRoam) {
        startFreeRoam()
    } else {
        startNextRace()
    }
}

function startNextRace() {
    freeRoamInProgress = false
    loadSelectedRaceMap()
    configureRaceDifficulty()
    configureRaceBackground()

    raceLap = 0
    checkpointArmed = false
    raceInProgress = true

    player.setFlag(SpriteFlag.Invisible, false)
    player.setFlag(SpriteFlag.GhostThroughWalls, false)
    tiles.placeOnTile(player, tiles.getTileLocation(11, 14))
    startPlayerMovement()
    startPlayerRaceHealth()
    startAIRaceSystems()
    scene.cameraFollowSprite(player)

    info.setScore(0)
    info.showScore(true)
    updateRaceMinimap()
    game.splash(raceName() + " RACE", "Pass the blue checkpoint, then cross the finish line!")
    info.startCountdown(raceTimeLimit)
}

function startFreeRoam() {
    stopAIRaceSystems()
    stopPlayerRaceHealth()
    raceInProgress = false
    freeRoamInProgress = true
    checkpointArmed = false

    loadSelectedFreeRoamMap()
    scroller.setLayerImage(scroller.BackgroundLayer.Layer0, image.create(1, 1))
    scroller.scrollBackgroundWithSpeed(0, 0)
    scene.setBackgroundColor(7)

    player.setFlag(SpriteFlag.Invisible, false)
    player.setFlag(SpriteFlag.GhostThroughWalls, false)
    tiles.placeOnTile(player, tiles.getTileLocation(16, 16))
    startPlayerMovement()
    scene.cameraFollowSprite(player)

    info.stopCountdown()
    info.setScore(0)
    info.showScore(false)

    if (raceMinimap) {
        raceMinimap.setFlag(SpriteFlag.Invisible, true)
    }

    game.splash(freeRoamThemeName() + " FREE ROAM", "Drive freely. Press B to return to the Garage.")
}

function completeCurrentRace(won: boolean) {
    if (!raceInProgress) {
        return
    }

    let timedOut = info.countdown() <= 0
    raceInProgress = false
    stopPlayerMovement()
    info.stopCountdown()
    stopAIRaceSystems()
    stopPlayerRaceHealth()

    if (won) {
        game.splash("YOU WIN!", "Prize: $" + racePrize)
    } else if (isPlayerCarWrecked()) {
        game.splash("CAR WRECKED", "Upgrade durability or avoid collisions.")
    } else if (timedOut) {
        game.splash("TIME UP", "Return to the garage and try again.")
    } else {
        game.splash("RACE LOST", "An opponent finished first.")
    }

    finishRace(won, won ? racePrize : 0)
}

function leaveRaceForGarage() {
    stopAIRaceSystems()
    stopPlayerRaceHealth()
    raceInProgress = false
    freeRoamInProgress = false
    checkpointArmed = false
    stopPlayerMovement()
    player.setFlag(SpriteFlag.Invisible, true)
    scene.setTileMapLevel(null)
    clearFreeRoamMapState()
    scene.centerCameraAt(80, 60)
    scroller.setLayerImage(scroller.BackgroundLayer.Layer0, image.create(1, 1))
    scroller.scrollBackgroundWithSpeed(0, 0)
    info.stopCountdown()
    info.setScore(0)
    info.showScore(false)

    if (raceMinimap) {
        raceMinimap.setFlag(SpriteFlag.Invisible, true)
    }
}

scene.onOverlapTile(SpriteKind.Player, assets.tile`raceCheckpointTile`, function (sprite, location) {
    if (raceInProgress) {
        checkpointArmed = true
    }
})

scene.onOverlapTile(SpriteKind.Player, assets.tile`raceFinishTile`, function (sprite, location) {
    if (!raceInProgress || !checkpointArmed) {
        return
    }

    checkpointArmed = false
    raceLap += 1
    info.setScore(raceLap)

    if (raceLap >= raceLapTarget) {
        completeCurrentRace(true)
    } else {
        player.sayText("Lap " + raceLap + "/" + raceLapTarget, 1000, false)
    }
})

info.onCountdownEnd(function () {
    if (raceInProgress) {
        completeCurrentRace(false)
    }
})

controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    // B has no race action. It exits only an active Free Roam session.
    if (freeRoamInProgress) {
        leaveRaceForGarage()
        openGarage(startSelectedDrivingMode)
    }
})

game.onUpdateInterval(500, function () {
    updateRaceMinimap()
})
