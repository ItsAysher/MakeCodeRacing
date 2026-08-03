// Race lifecycle, lap tracking, and results

let activeRaceDefinition: RaceDefinition = null
let checkpointArmed = false
let raceLap = 0

/** Initializes the selected race map, player systems, opponents, HUD, and timer. */
function startNextRace() {
    activeRaceDefinition = raceDefinitionForDifficulty(selectedRace)
    drivingSessionState = DrivingSessionState.Race
    checkpointArmed = false
    raceLap = 0

    tiles.setCurrentTilemap(activeRaceDefinition.map)
    resetRaceMinimapCache()
    scene.setBackgroundColor(7)

    createPlayer(CarImageDirection.Right)
    tiles.placeOnTile(
        player,
        tiles.getTileLocation(
            activeRaceDefinition.playerStartColumn,
            activeRaceDefinition.playerStartRow
        )
    )
    startPlayerMovement()
    startPlayerRaceHealth()
    startAIRaceSystems()
    scene.cameraFollowSprite(player)

    info.setScore(0)
    info.showScore(true)
    updateRaceMinimap()
    game.splash(
        activeRaceDefinition.name + " RACE",
        "Pass the checkpoint, then cross the finish line!"
    )
    info.startCountdown(activeRaceDefinition.timeLimit)
}

/**
 * Accepts the first race result, shows it, records progression, and opens the Garage.
 * @param won Whether the player completed the required laps before an opponent.
 */
function completeCurrentRace(won: boolean) {
    if (drivingSessionState != DrivingSessionState.Race) {
        return
    }

    // Change state before starting the result cutscene so simultaneous finish,
    // timeout, and wreck events cannot record the same race more than once.
    drivingSessionState = DrivingSessionState.RaceFinishing

    let timedOut = info.countdown() <= 0
    let carWrecked = isPlayerCarWrecked()
    let prizeMoney = won ? activeRaceDefinition.prize : 0
    player.vx = 0
    player.vy = 0
    pauseAIRaceSystems()
    info.stopCountdown()

    story.startCutscene(function () {
        if (won) {
            game.splash("YOU WIN!", "Prize: $" + prizeMoney)
        } else if (carWrecked) {
            game.splash("CAR WRECKED", "Upgrade durability or avoid collisions.")
        } else if (timedOut) {
            game.splash("TIME UP", "Return to the garage and try again.")
        } else {
            game.splash("RACE LOST", "An opponent finished first.")
        }

        leaveCurrentDrivingSession()
        recordRaceResult(won, prizeMoney)
        openGarage(startSelectedDrivingMode)
    })
}

/** Stops race-only systems and clears current race progress. */
function stopCurrentRace() {
    stopAIRaceSystems()
    stopPlayerRaceHealth()
    info.stopCountdown()
    info.setScore(0)
    info.showScore(false)
    hideRaceMinimap()
    checkpointArmed = false
    raceLap = 0
    activeRaceDefinition = null
}

// Arms the player to complete a lap after crossing the checkpoint.
scene.onOverlapTile(SpriteKind.Player, assets.tile`raceCheckpointTile`, function (sprite, location) {
    if (drivingSessionState == DrivingSessionState.Race) {
        checkpointArmed = true
    }
})

// Records an armed lap and completes the race when the target is reached.
scene.onOverlapTile(SpriteKind.Player, assets.tile`raceFinishTile`, function (sprite, location) {
    if (drivingSessionState != DrivingSessionState.Race || !checkpointArmed) {
        return
    }

    checkpointArmed = false
    raceLap += 1
    info.setScore(raceLap)

    if (raceLap >= activeRaceDefinition.lapTarget) {
        completeCurrentRace(true)
    } else {
        player.sayText(
            "Lap " + raceLap + "/" + activeRaceDefinition.lapTarget,
            1000,
            false
        )
    }
})

// Treats an expired countdown as a race loss.
info.onCountdownEnd(function () {
    if (drivingSessionState == DrivingSessionState.Race) {
        completeCurrentRace(false)
    }
})
