// Race timing, records, route progress, placement, and reward calculations

interface RaceRewardSummary {
    base: number
    placement: number
    clean: number
    time: number
    total: number
}

let bestRaceTimeMilliseconds = [0, 0, 0]
let bestLapTimeMilliseconds = [0, 0, 0]
let bestRaceFinish = [0, 0, 0]

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

let cachedRaceRouteSegmentStarts: number[] = []
let cachedRaceRouteSegmentLengths: number[] = []
let cachedRaceRouteTotalLength = 0
let cachedRaceFinishRouteOffset = 0

// Medal targets turn each circuit into a replayable mastery goal. Bronze is
// awarded for any classified finish; silver and gold require these times.
let raceSilverTargetMilliseconds = [33000, 80000, 180000]
let raceGoldTargetMilliseconds = [26000, 65000, 150000]

function selectedRaceIndex() {
    return selectedRace as number
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

/** Caches loop segment lengths once per authored race. */
function prepareRaceRouteProgress() {
    cachedRaceRouteSegmentStarts = []
    cachedRaceRouteSegmentLengths = []
    cachedRaceRouteTotalLength = 0
    cachedRaceFinishRouteOffset = 0
    playerRaceRouteGateIndex = 0
    playerRaceRouteGatesPassed = 0
    playerRaceWrongWayMilliseconds = 0
    playerRaceWrongWay = false
    playerRaceInvalidFinishWarningAt = 0

    if (!activeRaceDefinition ||
        activeRaceDefinition.aiCheckpoints.length < 2) {
        return
    }

    let route = activeRaceDefinition.aiCheckpoints
    for (let index = 0; index < route.length; index++) {
        let nextIndex = (index + 1) % route.length
        let dx = (route[nextIndex][0] - route[index][0]) * 16
        let dy = (route[nextIndex][1] - route[index][1]) * 16
        let length = Math.sqrt(dx * dx + dy * dy)
        cachedRaceRouteSegmentStarts.push(cachedRaceRouteTotalLength)
        cachedRaceRouteSegmentLengths.push(length)
        cachedRaceRouteTotalLength += length
    }

    let finishTiles = tiles.getTilesByType(assets.tile`raceFinishTile`)
    if (finishTiles.length > 0) {
        cachedRaceFinishRouteOffset = rawRaceRouteProgressAt(
            finishTiles[0].x,
            finishTiles[0].y
        )
    }
}

/** True only after every authored route gate for the current lap was passed. */
function playerRaceRouteIsCompleteForLap() {
    if (!activeRaceDefinition) {
        return false
    }
    let gateCount = activeRaceDefinition.aiCheckpoints.length
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
    return activeRaceDefinition.aiCheckpoints[gateIndex][0] * 16 + 8
}

function raceRouteGatePixelY(gateIndex: number) {
    return activeRaceDefinition.aiCheckpoints[gateIndex][1] * 16 + 8
}

/** Advances generous invisible progress gates and diagnoses sustained wrong-way driving. */
function updatePlayerRaceRouteProgress(deltaTime: number) {
    if (drivingSessionState != DrivingSessionState.Race || !player ||
        !activeRaceDefinition ||
        activeRaceDefinition.aiCheckpoints.length == 0) {
        return
    }

    let targetX = raceRouteGatePixelX(playerRaceRouteGateIndex)
    let targetY = raceRouteGatePixelY(playerRaceRouteGateIndex)
    let offsetX = targetX - player.x
    let offsetY = targetY - player.y
    let distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY)
    if (distance <= 40) {
        playerRaceRouteGatesPassed += 1
        playerRaceRouteGateIndex = (playerRaceRouteGateIndex + 1) %
            activeRaceDefinition.aiCheckpoints.length
        playerRaceWrongWayMilliseconds = 0
        playerRaceWrongWay = false
        return
    }

    let speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy)
    let travelTowardGate = player.vx * offsetX + player.vy * offsetY
    if (speed > 24 && travelTowardGate < 0) {
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
        activeRaceDefinition.aiCheckpoints.length == 0) {
        return 0
    }

    let gateCount = activeRaceDefinition.aiCheckpoints.length
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

/** Finds the closest projected point on the authored AI route. */
function rawRaceRouteProgressAt(x: number, y: number) {
    if (!activeRaceDefinition || cachedRaceRouteTotalLength <= 0) {
        return 0
    }

    let route = activeRaceDefinition.aiCheckpoints
    let bestDistanceSquared = 1000000000
    let bestProgress = 0

    for (let index = 0; index < route.length; index++) {
        let nextIndex = (index + 1) % route.length
        let startX = route[index][0] * 16 + 8
        let startY = route[index][1] * 16 + 8
        let endX = route[nextIndex][0] * 16 + 8
        let endY = route[nextIndex][1] * 16 + 8
        let dx = endX - startX
        let dy = endY - startY
        let lengthSquared = dx * dx + dy * dy
        let projection = 0
        if (lengthSquared > 0) {
            projection = ((x - startX) * dx + (y - startY) * dy) /
                lengthSquared
            projection = Math.max(0, Math.min(1, projection))
        }

        let closestX = startX + dx * projection
        let closestY = startY + dy * projection
        let offsetX = x - closestX
        let offsetY = y - closestY
        let distanceSquared = offsetX * offsetX + offsetY * offsetY
        if (distanceSquared < bestDistanceSquared) {
            bestDistanceSquared = distanceSquared
            bestProgress = cachedRaceRouteSegmentStarts[index] +
                cachedRaceRouteSegmentLengths[index] * projection
        }
    }
    return bestProgress
}

function adjustedRaceRouteProgress(
    racer: Sprite,
    completedLaps: number,
    checkpointWasArmed: boolean
) {
    if (!racer || cachedRaceRouteTotalLength <= 0) {
        return completedLaps * cachedRaceRouteTotalLength
    }

    let routeProgress = rawRaceRouteProgressAt(racer.x, racer.y) -
        cachedRaceFinishRouteOffset
    while (routeProgress < 0) {
        routeProgress += cachedRaceRouteTotalLength
    }
    while (routeProgress >= cachedRaceRouteTotalLength) {
        routeProgress -= cachedRaceRouteTotalLength
    }

    // Starting-grid cars are immediately behind the finish line. Until they
    // reach the checkpoint, keep that wrapped coordinate behind zero rather
    // than incorrectly treating it as almost one full lap complete.
    if (!checkpointWasArmed && completedLaps == 0 &&
        routeProgress > cachedRaceRouteTotalLength * 0.72) {
        routeProgress -= cachedRaceRouteTotalLength
    }
    return completedLaps * cachedRaceRouteTotalLength + routeProgress
}

/** Returns the player's live place among every active circuit racer. */
function racePositionForPlayer() {
    if (!player || !activeRaceDefinition ||
        activeRaceDefinition.aiCheckpoints.length == 0) {
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

function resetRaceRecordProgress() {
    bestRaceTimeMilliseconds = [0, 0, 0]
    bestLapTimeMilliseconds = [0, 0, 0]
    bestRaceFinish = [0, 0, 0]
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
    for (let index = 0; index < 3; index++) {
        recordText += "\n\n" + names[index] +
            " [" + raceMedalShortForTime(
                index,
                bestRaceTimeMilliseconds[index]
            ) + "]" +
            "\nRace: " + raceRecordValue(bestRaceTimeMilliseconds[index]) +
            "  Lap: " + raceRecordValue(bestLapTimeMilliseconds[index]) +
            "\nBest finish: " +
            (bestRaceFinish[index] > 0 ?
                raceOrdinal(bestRaceFinish[index]) : "--")
    }
    game.showLongText(recordText, DialogLayout.Full)
}
