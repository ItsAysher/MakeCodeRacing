// Race lifecycle, lap tracking, and results

let activeRaceDefinition: RaceDefinition = null
let activeRaceCheckpoints: number[][] = []
let checkpointArmed = false
let raceLap = 0
let raceFinishedCompetitorCount = 0
let raceSessionId = 0
let raceCountdownSprite: Sprite = null

function setRaceCountdownDisplay(text: string, color: number) {
    if (raceCountdownSprite) {
        raceCountdownSprite.destroy()
    }
    let countdownImage = image.create(54, 30)
    countdownImage.fill(15)
    countdownImage.drawRect(0, 0, 54, 30, color)
    countdownImage.print(
        text,
        (54 - text.length * image.font12.charWidth) >> 1,
        8,
        color,
        image.font12
    )
    raceCountdownSprite = sprites.create(
        countdownImage,
        SpriteKind.RaceHud
    )
    raceCountdownSprite.setFlag(SpriteFlag.RelativeToCamera, true)
    raceCountdownSprite.setFlag(SpriteFlag.Ghost, true)
    raceCountdownSprite.z = 130
    raceCountdownSprite.setPosition(80, 60)
}

function clearRaceCountdownDisplay() {
    if (raceCountdownSprite) {
        raceCountdownSprite.destroy()
        raceCountdownSprite = null
    }
}

/** Runs a cancellable grid sequence and releases every racer on GO. */
function runRaceStartCountdown(sessionId: number) {
    control.runInParallel(function () {
        let labels = ["3", "2", "1"]
        let tones = [262, 330, 392]
        for (let index = 0; index < labels.length; index++) {
            if (raceSessionId != sessionId ||
                drivingSessionState != DrivingSessionState.RaceStarting) {
                clearRaceCountdownDisplay()
                return
            }
            setRaceCountdownDisplay(labels[index], 5)
            if (racingSoundsAreEnabled()) {
                music.playTone(tones[index], 100)
            }
            pause(550)
        }

        if (raceSessionId != sessionId ||
            drivingSessionState != DrivingSessionState.RaceStarting) {
            clearRaceCountdownDisplay()
            return
        }

        drivingSessionState = DrivingSessionState.Race
        startCurrentRaceTiming()
        resumeAIRaceSystems()
        createRaceHud()
        updateRaceMinimap()
        setRaceCountdownDisplay("GO!", 7)
        if (racingSoundsAreEnabled()) {
            music.playTone(523, 180)
        }
        shakeRacingCamera(1, 100)
        pause(450)
        if (raceSessionId == sessionId) {
            clearRaceCountdownDisplay()
        }
    })
}

/** Initializes the selected race map, player systems, opponents, HUD, and timer. */
function startNextRace() {
    raceSessionId += 1
    let startingSessionId = raceSessionId
    // The authored championship remains the canonical forward series even if
    // the player last selected a reverse single event in the Garage.
    if (championshipActive) {
        selectedRaceLayout = RaceLayout.Forward
    }
    activeRaceDefinition = raceDefinitionForDifficulty(selectedRace)
    activeRaceCheckpoints = raceCheckpointsForLayout(
        activeRaceDefinition,
        selectedRaceLayout
    )
    drivingSessionState = DrivingSessionState.RaceStarting
    checkpointArmed = false
    raceLap = 0
    raceFinishedCompetitorCount = 0

    tiles.setCurrentTilemap(activeRaceDefinition.map)
    prepareRaceRouteProgress()
    resetRaceMinimapCache()
    scene.setBackgroundColor(7)

    createPlayer(raceStartDirection(selectedRaceLayout))
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
    pauseAIRaceSystems()
    scene.cameraFollowSprite(player)

    info.showScore(false)
    info.showCountdown(false)
    game.splash(
        activeRaceDefinition.name + " " +
            raceLayoutLabel(selectedRaceLayout) + " RACE",
        activeRaceDefinition.lapTarget + " LAP" +
            (activeRaceDefinition.lapTarget == 1 ? "" : "S") +
            " | Prize $" + activeRaceDefinition.prize
    )
    runRaceStartCountdown(startingSessionId)
}

/** Locks in one AI finishing place while allowing the rest of the field to continue. */
function recordAIRacerFinish(racer: Sprite) {
    if (drivingSessionState != DrivingSessionState.Race ||
        racer.data.finished) {
        return
    }
    raceFinishedCompetitorCount += 1
    racer.data.finished = true
    racer.data.finishPlace = raceFinishedCompetitorCount
    racer.data.checkpointArmed = false
    racer.vx = 0
    racer.vy = 0
    racer.setFlag(SpriteFlag.Ghost, true)
    racer.sayText(
        raceOrdinal(racer.data.finishPlace) + " " + racer.data.racerName,
        1200,
        false
    )
}

function raceResultDescription(
    completedRace: boolean,
    carWrecked: boolean,
    timedOut: boolean,
    position: number,
    reward: RaceRewardSummary
) {
    let title = completedRace ?
        raceOrdinal(position) + " PLACE" :
        (carWrecked ? "CAR WRECKED" :
            (timedOut ? "TIME UP" : "RACE ENDED"))
    let result = title +
        "\nTime: " + formatRaceTime(currentRaceTimeMilliseconds()) +
        "\nFastest lap: " +
        raceRecordValue(currentRaceFastestLapMilliseconds) +
        "\nDurability: " + Math.max(0, Math.floor(playerRaceHealth)) +
        "/" + playerMaximumDurability +
        (completedRace ?
            "\nMedal: " + raceMedalForTime(
                selectedRace as number,
                currentRaceTimeMilliseconds()
            ) : "") +
        currentRaceRecordHighlights() +
        "\nBase prize: $" + reward.base
    if (reward.placement > 0) {
        result += "\nPlacement: $" + reward.placement
    }
    if (reward.clean > 0) {
        result += "\nClean-race bonus: $" + reward.clean
    }
    if (reward.time > 0) {
        result += "\nTime bonus: $" + reward.time
    }
    result += "\nTOTAL: $" + reward.total
    return result
}

/**
 * Accepts the first race result, shows it, records progression, and opens the Garage.
 * @param won Whether the player completed the required laps before an opponent.
 */
function completeCurrentRace(completedRace: boolean) {
    if (drivingSessionState != DrivingSessionState.Race) {
        return
    }

    // Change state before starting the result cutscene so simultaneous finish,
    // timeout, and wreck events cannot record the same race more than once.
    drivingSessionState = DrivingSessionState.RaceFinishing

    let timedOut = currentRaceRemainingMilliseconds() <= 0
    let carWrecked = isPlayerCarWrecked()
    let position = completedRace ?
        raceFinishedCompetitorCount + 1 : racePositionForPlayer()
    let won = completedRace && position == 1
    let championshipRoundFinished = championshipActive
    if (championshipRoundFinished) {
        recordChampionshipRound(position, completedRace)
    }
    stopCurrentRaceTiming(position, completedRace)
    let reward = calculateCurrentRaceReward(
        won,
        completedRace && !won,
        position
    )
    player.vx = 0
    player.vy = 0
    pauseAIRaceSystems()

    story.startCutscene(function () {
        let unlockedContent = recordRaceResult(won, reward.total)
        game.showLongText(
            raceResultDescription(
                completedRace,
                carWrecked,
                timedOut,
                position,
                reward
            ),
            DialogLayout.Full
        )
        if (unlockedContent.length > 0) {
            game.showLongText(
                "NEW UNLOCK\n" + unlockedContent +
                    "\nAvailable from the Garage.",
                DialogLayout.Full
            )
        }
        if (championshipRoundFinished) {
            showChampionshipRoundStandings()
            let continueSeries = advanceChampionshipSeries()
            leaveCurrentDrivingSession()
            if (continueSeries) {
                startNextRace()
            } else {
                showGarage()
                startSelectedDrivingMode()
            }
        } else {
            story.showPlayerChoices("Rematch", "Garage")
            let rematch = story.checkLastAnswer("Rematch")
            leaveCurrentDrivingSession()
            if (rematch) {
                startNextRace()
            } else {
                showGarage()
                startSelectedDrivingMode()
            }
        }
    })
}

/** Stops race-only systems and clears current race progress. */
function stopCurrentRace() {
    raceSessionId += 1
    currentRaceTimingActive = false
    stopAIRaceSystems()
    stopPlayerRaceHealth()
    info.setScore(0)
    info.showScore(false)
    info.showCountdown(false)
    hideRaceMinimap()
    destroyRaceHud()
    clearRaceCountdownDisplay()
    checkpointArmed = false
    raceLap = 0
    activeRaceDefinition = null
    activeRaceCheckpoints = []
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
    if (!playerRaceRouteIsCompleteForLap()) {
        showInvalidRaceFinishWarning()
        return
    }

    checkpointArmed = false
    raceLap += 1
    recordCurrentRaceLapTime()
    refreshRaceHud()

    if (raceLap >= activeRaceDefinition.lapTarget) {
        completeCurrentRace(true)
    } else {
        showRaceBanner(
            raceLap + 1 == activeRaceDefinition.lapTarget ?
                "FINAL LAP" :
                "LAP " + (raceLap + 1) + "/" +
                    activeRaceDefinition.lapTarget,
            raceLap + 1 == activeRaceDefinition.lapTarget ? 5 : 7
        )
    }
})
