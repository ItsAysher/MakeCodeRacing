// Race timing, records, route progress, placement, and reward calculations

interface RaceRewardSummary {
    base: number
    placement: number
    clean: number
    time: number
    total: number
}

// Forward records retain indices 0-2 for save compatibility. Reverse records
// use 3-5 and are persisted under a separate versioned settings key.
let bestRaceTimeMilliseconds = [0, 0, 0, 0, 0, 0]
let bestLapTimeMilliseconds = [0, 0, 0, 0, 0, 0]
let bestRaceFinish = [0, 0, 0, 0, 0, 0]

let currentRaceElapsedMilliseconds = 0
let currentLapElapsedMilliseconds = 0
let currentRaceLastLapMilliseconds = 0
let currentRaceFastestLapMilliseconds = 0
let currentRaceTimingActive = false
let currentRaceFinishPosition = 0
let currentRaceReward: RaceRewardSummary = null
let currentRaceSetBestTime = false
let currentRaceSetBestLap = false
let playerRaceRouteGateIndex = 0
let playerRaceRouteGatesPassed = 0
let playerRaceWrongWayMilliseconds = 0
let playerRaceWrongWay = false
let playerRaceInvalidFinishWarningAt = 0

// Medal targets turn each circuit into a replayable mastery goal. Bronze is
// awarded for any classified finish; silver and gold require these times.
let raceSilverTargetMilliseconds = [33000, 80000, 180000]
let raceGoldTargetMilliseconds = [26000, 65000, 150000]

function raceRecordIndex(
    difficulty: RaceDifficulty,
    layout: RaceLayout
) {
    return difficulty as number +
        (layout == RaceLayout.Reverse ? 3 : 0)
}

function selectedRaceIndex() {
    return raceRecordIndex(selectedRace, selectedRaceLayout)
}

function formatRaceTime(milliseconds: number) {
    milliseconds = Math.max(0, Math.floor(milliseconds))
    let totalSeconds = Math.idiv(milliseconds, 1000)
    let minutes = Math.idiv(totalSeconds, 60)
    let seconds = totalSeconds % 60
    let tenths = Math.idiv(milliseconds % 1000, 100)
    return minutes + ":" + (seconds < 10 ? "0" : "") +
        seconds + "." + tenths
}

function raceOrdinal(position: number) {
    if (position == 1) {
        return "1ST"
    } else if (position == 2) {
        return "2ND"
    } else if (position == 3) {
        return "3RD"
    }
    return position + "TH"
}

function raceMedalForTime(raceIndex: number, milliseconds: number) {
    if (milliseconds <= 0) {
        return ""
    } else if (milliseconds <= raceGoldTargetMilliseconds[raceIndex]) {
        return "GOLD"
    } else if (milliseconds <= raceSilverTargetMilliseconds[raceIndex]) {
        return "SILVER"
    }
    return "BRONZE"
}

function raceMedalShortForTime(raceIndex: number, milliseconds: number) {
    let medal = raceMedalForTime(raceIndex, milliseconds)
    return medal.length > 0 ? medal.charAt(0) : "-"
}

/** Resets ordered route validation for a new race or restart. */
function prepareRaceRouteProgress() {
    playerRaceRouteGateIndex = 0
    playerRaceRouteGatesPassed = 0
    playerRaceWrongWayMilliseconds = 0
    playerRaceWrongWay = false
    playerRaceInvalidFinishWarningAt = 0
}

/** True only after every authored route gate for the current lap was passed. */
function playerRaceRouteIsCompleteForLap() {
    if (!activeRaceDefinition) {
        return false
    }
    let gateCount = activeRaceCheckpoints.length
    return gateCount > 0 && playerRaceRouteGatesPassed >=
        gateCount * (raceLap + 1)
}

/** Rate-limits feedback when a shortcut reaches the finish out of order. */
function showInvalidRaceFinishWarning() {
    let now = control.millis()
    if (now >= playerRaceInvalidFinishWarningAt) {
        playerRaceInvalidFinishWarningAt = now + 1200
        showRaceBanner("ROUTE INCOMPLETE", 2)
    }
}

function raceRouteGatePixelX(gateIndex: number) {
    return activeRaceCheckpoints[gateIndex][0] * 16 + 8
}

function raceRouteGatePixelY(gateIndex: number) {
    return activeRaceCheckpoints[gateIndex][1] * 16 + 8
}

/** Advances ordered road gates and diagnoses sustained wrong-way driving. */
function updatePlayerRaceRouteProgress(deltaTime: number) {
    if (drivingSessionState != DrivingSessionState.Race || !player ||
        !activeRaceDefinition || activeRaceCheckpoints.length == 0) {
        return
    }

    let targetX = raceRouteGatePixelX(playerRaceRouteGateIndex)
    let targetY = raceRouteGatePixelY(playerRaceRouteGateIndex)
    let gateRadius = 40
    let expertRoute = activeRaceDefinition == expertRaceDefinition
    if (expertRoute) {
        let authoredIndex = selectedRaceLayout == RaceLayout.Reverse ?
            activeRaceCheckpoints.length - 1 - playerRaceRouteGateIndex :
            playerRaceRouteGateIndex
        let bounds = expertRaceGateBounds[authoredIndex]
        // Aim at the nearest point of the whole corner, not the AI apex.
        // Include subpixels up to the last Fx8 coordinate inside the tile.
        targetX = Math.max(bounds[0] * 16,
            Math.min(bounds[2] * 16 + 16 - 1 / 256, player.x))
        targetY = Math.max(bounds[1] * 16,
            Math.min(bounds[3] * 16 + 16 - 1 / 256, player.y))
        gateRadius = 0
    }
    let offsetX = targetX - player.x
    let offsetY = targetY - player.y
    let distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY)
    if (distance <= gateRadius && (!expertRoute ||
        tiles.tileAtLocationEquals(player.tilemapLocation(),
            assets.tile`raceRoadTile`))) {
        playerRaceRouteGatesPassed += 1
        playerRaceRouteGateIndex = (playerRaceRouteGateIndex + 1) %
            activeRaceCheckpoints.length
        playerRaceWrongWayMilliseconds = 0
        playerRaceWrongWay = false
        return
    }

    let speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy)
    let travelTowardGate = player.vx * offsetX + player.vy * offsetY
    // Expert's wide corners allow lateral corrections; require a clear
    // retreat (over 120 degrees away) before accumulating WRONG WAY.
    let wrongWayThreshold = expertRoute ? -0.5 * speed * distance : 0
    if (speed > 24 && travelTowardGate < wrongWayThreshold) {
        playerRaceWrongWayMilliseconds += deltaTime * 1000
    } else {
        playerRaceWrongWayMilliseconds = Math.max(
            0,
            playerRaceWrongWayMilliseconds - deltaTime * 1600
        )
    }
    playerRaceWrongWay = playerRaceWrongWayMilliseconds >= 1200
}

function routeGateFraction(
    racer: Sprite,
    targetGateIndex: number
) {
    if (!racer || !activeRaceDefinition ||
        activeRaceCheckpoints.length == 0) {
        return 0
    }

    let gateCount = activeRaceCheckpoints.length
    let previousGateIndex = (targetGateIndex + gateCount - 1) % gateCount
    let startX = raceRouteGatePixelX(previousGateIndex)
    let startY = raceRouteGatePixelY(previousGateIndex)
    let endX = raceRouteGatePixelX(targetGateIndex)
    let endY = raceRouteGatePixelY(targetGateIndex)
    let dx = endX - startX
    let dy = endY - startY
    let lengthSquared = dx * dx + dy * dy
    if (lengthSquared <= 0) {
        return 0
    }
    return Math.max(0, Math.min(0.99,
        ((racer.x - startX) * dx + (racer.y - startY) * dy) /
            lengthSquared
    ))
}

/** Returns the player's live place among every active circuit racer. */
function racePositionForPlayer() {
    if (!player || !activeRaceDefinition ||
        activeRaceCheckpoints.length == 0) {
        return 1
    }

    let playerProgress = playerRaceRouteGatesPassed +
        routeGateFraction(player, playerRaceRouteGateIndex)
    let position = 1
    for (let racer of aiRacers) {
        let racerProgress: number = racer.data.routeGatesPassed +
            routeGateFraction(racer, racer.data.waypoint)
        if (racer.data.finished || racerProgress > playerProgress + 0.05) {
            position += 1
        }
    }
    return position
}

function startCurrentRaceTiming() {
    currentRaceElapsedMilliseconds = 0
    currentLapElapsedMilliseconds = 0
    currentRaceLastLapMilliseconds = 0
    currentRaceFastestLapMilliseconds = 0
    currentRaceFinishPosition = 0
    currentRaceReward = null
    currentRaceSetBestTime = false
    currentRaceSetBestLap = false
    currentRaceTimingActive = true
}

function currentRaceTimeMilliseconds() {
    return currentRaceElapsedMilliseconds
}

function currentRaceRemainingMilliseconds() {
    if (!activeRaceDefinition) {
        return 0
    }
    return Math.max(
        0,
        activeRaceDefinition.timeLimit * 1000 -
            currentRaceElapsedMilliseconds
    )
}

/** Records a completed lap and updates the persistent fastest-lap candidate. */
function recordCurrentRaceLapTime() {
    if (!currentRaceTimingActive) {
        return 0
    }

    currentRaceLastLapMilliseconds = currentLapElapsedMilliseconds
    currentLapElapsedMilliseconds = 0
    if (currentRaceFastestLapMilliseconds == 0 ||
        currentRaceLastLapMilliseconds < currentRaceFastestLapMilliseconds) {
        currentRaceFastestLapMilliseconds = currentRaceLastLapMilliseconds
    }
    let raceIndex = selectedRaceIndex()
    if (bestLapTimeMilliseconds[raceIndex] == 0 ||
        currentRaceLastLapMilliseconds < bestLapTimeMilliseconds[raceIndex]) {
        bestLapTimeMilliseconds[raceIndex] = currentRaceLastLapMilliseconds
        currentRaceSetBestLap = true
        // Preserve a lap record even if the player later restarts or leaves
        // the race before a classified finish.
        saveGameProgress()
    }
    return currentRaceLastLapMilliseconds
}

function stopCurrentRaceTiming(position: number, completedRace: boolean) {
    currentRaceTimingActive = false
    currentRaceFinishPosition = position

    let raceIndex = selectedRaceIndex()
    if (completedRace && position > 0 &&
        (bestRaceFinish[raceIndex] == 0 ||
            position < bestRaceFinish[raceIndex])) {
        bestRaceFinish[raceIndex] = position
    }
    if (completedRace &&
        (bestRaceTimeMilliseconds[raceIndex] == 0 ||
            currentRaceElapsedMilliseconds <
                bestRaceTimeMilliseconds[raceIndex])) {
        bestRaceTimeMilliseconds[raceIndex] =
            currentRaceElapsedMilliseconds
        currentRaceSetBestTime = true
    }
}

function calculateCurrentRaceReward(
    won: boolean,
    lostToOpponent: boolean,
    position: number
) {
    let reward: RaceRewardSummary = {
        base: won ? activeRaceDefinition.prize : 0,
        placement: 0,
        clean: 0,
        time: 0,
        total: 0
    }

    if (!won && lostToOpponent) {
        if (position == 2) {
            reward.placement = Math.floor(activeRaceDefinition.prize * 0.25)
        } else if (position == 3) {
            reward.placement = Math.floor(activeRaceDefinition.prize * 0.12)
        }
    }
    if (won && playerRaceHealth >= playerMaximumDurability * 0.8) {
        reward.clean = Math.max(10, Math.floor(
            activeRaceDefinition.prize * 0.1
        ))
    }
    if (won && currentRaceRemainingMilliseconds() >=
        activeRaceDefinition.timeLimit * 300) {
        reward.time = Math.max(10, Math.floor(
            activeRaceDefinition.prize * 0.1
        ))
    }

    reward.total = reward.base + reward.placement +
        reward.clean + reward.time
    currentRaceReward = reward
    return reward
}

function loadRaceRecordProgress(
    raceTimes: number[],
    lapTimes: number[],
    finishes: number[]
) {
    for (let index = 0; index < 3; index++) {
        bestRaceTimeMilliseconds[index] = loadWholeNumber(
            raceTimes[index], 0, 3600000
        )
        bestLapTimeMilliseconds[index] = loadWholeNumber(
            lapTimes[index], 0, 3600000
        )
        bestRaceFinish[index] = loadWholeNumber(finishes[index], 0, 5)
    }
}

function loadReverseRaceRecordProgress(
    raceTimes: number[],
    lapTimes: number[],
    finishes: number[]
) {
    for (let index = 0; index < 3; index++) {
        let recordIndex = index + 3
        bestRaceTimeMilliseconds[recordIndex] = loadWholeNumber(
            raceTimes[index], 0, 3600000
        )
        bestLapTimeMilliseconds[recordIndex] = loadWholeNumber(
            lapTimes[index], 0, 3600000
        )
        bestRaceFinish[recordIndex] = loadWholeNumber(
            finishes[index], 0, 5
        )
    }
}

function resetRaceRecordProgress() {
    bestRaceTimeMilliseconds = [0, 0, 0, 0, 0, 0]
    bestLapTimeMilliseconds = [0, 0, 0, 0, 0, 0]
    bestRaceFinish = [0, 0, 0, 0, 0, 0]
    selectedRaceLayout = RaceLayout.Forward
    currentRaceTimingActive = false
    currentRaceElapsedMilliseconds = 0
    currentRaceLastLapMilliseconds = 0
    currentRaceFastestLapMilliseconds = 0
    currentRaceFinishPosition = 0
    currentRaceReward = null
    currentRaceSetBestTime = false
    currentRaceSetBestLap = false
}

function racePlayerIsWrongWay() {
    return playerRaceWrongWay
}

game.onUpdate(function () {
    if (!currentRaceTimingActive ||
        drivingSessionState != DrivingSessionState.Race) {
        return
    }

    let deltaTime = game.eventContext().deltaTime
    currentRaceElapsedMilliseconds += deltaTime * 1000
    currentLapElapsedMilliseconds += deltaTime * 1000
    updatePlayerRaceRouteProgress(deltaTime)

    if (currentRaceRemainingMilliseconds() <= 0) {
        completeCurrentRace(false)
    }
})

function raceRecordValue(value: number) {
    return value > 0 ? formatRaceTime(value) : "--:--.-"
}

function currentRaceRecordHighlights() {
    let highlights = ""
    if (currentRaceSetBestTime) {
        highlights += "\nNEW RACE RECORD"
    }
    if (currentRaceSetBestLap) {
        highlights += "\nNEW LAP RECORD"
    }
    return highlights
}

function showRaceRecords() {
    let names = ["BEGINNER", "INTERMEDIATE", "EXPERT"]
    let recordText = "PERSONAL RECORDS"
    for (let layoutIndex = 0; layoutIndex < 2; layoutIndex++) {
        let layout = layoutIndex as RaceLayout
        recordText += "\n== " + raceLayoutLabel(layout) + " =="
        for (let difficultyIndex = 0;
            difficultyIndex < 3;
            difficultyIndex++) {
            let recordIndex = raceRecordIndex(
                difficultyIndex as RaceDifficulty,
                layout
            )
            recordText += "\n" + names[difficultyIndex] +
                " [" + raceMedalShortForTime(
                    difficultyIndex,
                    bestRaceTimeMilliseconds[recordIndex]
                ) + "]" +
                "\nRace: " + raceRecordValue(
                    bestRaceTimeMilliseconds[recordIndex]
                ) +
                "  Lap: " + raceRecordValue(
                    bestLapTimeMilliseconds[recordIndex]
                ) +
                "\nBest finish: " +
                (bestRaceFinish[recordIndex] > 0 ?
                    raceOrdinal(bestRaceFinish[recordIndex]) : "--")
        }
    }
    game.showLongText(recordText, DialogLayout.Full)
}
