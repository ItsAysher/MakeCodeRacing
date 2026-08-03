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

function loadSelectedRaceMap() {
    if (selectedRace == RaceDifficulty.Expert) {
        tiles.setCurrentTilemap(tilemap`expertRaceMap`)
    } else if (selectedRace == RaceDifficulty.Intermediate) {
        tiles.setCurrentTilemap(tilemap`intermediateRaceMap`)
    } else {
        tiles.setCurrentTilemap(tilemap`beginnerRaceMap`)
    }
}

/**
 * Sets lap count, prize money, and time limit for the selected difficulty.
 */
function configureRaceDifficulty() {
    if (selectedRace == RaceDifficulty.Expert) {
        raceLapTarget = 3
        // One Expert win buys one Tier 3 part + a paint
        racePrize = 1300
        raceTimeLimit = 120
    } else if (selectedRace == RaceDifficulty.Intermediate) {
        raceLapTarget = 2
        // Two Intermediate wins buy one Tier 3 part.
        racePrize = 500
        raceTimeLimit = 55
    } else {
        raceLapTarget = 1
        // Three Beginner wins buy one Tier 2 part.
        racePrize = 100
        raceTimeLimit = 40
    }
}

function configureRaceBackground() {
    scene.setBackgroundColor(7)
}

function raceName() {
    if (selectedRace == RaceDifficulty.Expert) {
        return "EXPERT"
    } else if (selectedRace == RaceDifficulty.Intermediate) {
        return "INTERMEDIATE"
    }
    return "BEGINNER"
}

function playerRaceStartingLocation() {
    if (selectedRace == RaceDifficulty.Expert) {
        return tiles.getTileLocation(35, 45)
    } else if (selectedRace == RaceDifficulty.Intermediate) {
        return tiles.getTileLocation(11, 28)
    }
    return tiles.getTileLocation(11, 14)
}

/**
 * Starts either a race or Free Roam after the Garage closes.
 */
function startSelectedDrivingMode() {
    if (selectedDrivingMode == DrivingMode.FreeRoam) {
        startFreeRoam()
    } else {
        startNextRace()
    }
}

/**
 * Initializes a race map, player systems, AI opponents, HUD, and countdown.
 */
function startNextRace() {
    freeRoamInProgress = false
    loadSelectedRaceMap()
    configureRaceDifficulty()
    configureRaceBackground()

    raceLap = 0
    checkpointArmed = false
    raceInProgress = true

    createPlayer(CarImageDirection.Right)
    tiles.placeOnTile(player, playerRaceStartingLocation())
    startPlayerMovement()
    startPlayerRaceHealth()
    startAIRaceSystems()
    scene.cameraFollowSprite(player)

    info.setScore(0)
    info.showScore(true)
    updateRaceMinimap()
    game.splash(raceName() + " RACE", "Pass the checkpoint, then cross the finish line!")
    info.startCountdown(raceTimeLimit)
}

/**
 * Initializes the selected randomized Free Roam map without race-only systems.
 */
function startFreeRoam() {
    freeRoamInProgress = true
    checkpointArmed = false

    loadSelectedFreeRoamMap()
    scene.setBackgroundColor(7)

    createPlayer(CarImageDirection.Right)
    tiles.placeOnTile(player, tiles.getTileLocation(16, 16))
    startPlayerMovement()
    scene.cameraFollowSprite(player)

    game.splash(freeRoamThemeName() + " FREE ROAM", "Drive freely. Press B to return to the Garage.")
}

/**
 * Stops the active race, shows the appropriate result, and awards prize money.
 * @param won Whether the player completed the required laps before an opponent.
 */
function completeCurrentRace(won: boolean) {
    if (!raceInProgress) {
        return
    }

    let timedOut = info.countdown() <= 0
    let carWrecked = isPlayerCarWrecked()

    // result flow in a cutscene so cleanup happens after that callback returns.
    story.startCutscene(function () {
        if (won) {
            game.splash("YOU WIN!", "Prize: $" + racePrize)
        } else if (carWrecked) {
            game.splash("CAR WRECKED", "Upgrade durability or avoid collisions.")
        } else if (timedOut) {
            game.splash("TIME UP", "Return to the garage and try again.")
        } else {
            game.splash("RACE LOST", "An opponent finished first.")
        }

        leaveForGarage()
        finishRace(won, won ? racePrize : 0)
    })
}

/**
 * Clears the active driving mode and restores the neutral Garage scene state.
 */
function leaveForGarage() {
    if (freeRoamInProgress) {
        freeRoamInProgress = false
        clearFreeRoamMapState()
    } else if (raceInProgress) {
        stopAIRaceSystems()
        stopPlayerRaceHealth()
        info.stopCountdown()
        info.setScore(0)
        info.showScore(false)
        hideRaceMinimap()
        raceInProgress = false
    }

    checkpointArmed = false
    destroyPlayer()
    scene.centerCameraAt(80, 60)
    tiles.setCurrentTilemap(null)
}

// Arms the player to complete a lap after crossing the finish line.
scene.onOverlapTile(SpriteKind.Player, assets.tile`raceCheckpointTile`, function (sprite, location) {
    if (raceInProgress) {
        checkpointArmed = true
    }
})

// Records an armed lap and completes the race when the target is reached.
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

// Treats an expired countdown as a race loss.
info.onCountdownEnd(function () {
    if (raceInProgress) {
        completeCurrentRace(false)
    }
})
