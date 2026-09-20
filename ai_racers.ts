// Race opponent creation, navigation, rendering, and lap progress

let aiRaceSystemsActive = false
let aiRacers: Sprite[] = []
let activeAICheckpoints: number[][] = []

interface AIRacerProfile {
    name: string
    speed: number
    acceleration: number
    steering: number
    cornerSpeed: number
    recoveryMilliseconds: number
}

let beginnerAIRacerNames = ["MOSS", "PIP", "JUNO", "ZIP"]
let intermediateAIRacerNames = ["EMBER", "MICA", "RIFT", "VOLT"]
let expertAIRacerNames = ["NOVA", "APEX", "ONYX", "CROWN"]
let aiSpeedProfiles = [0.94, 1, 0.97, 1.03]
let aiAccelerationProfiles = [70, 65, 80, 75]
let aiSteeringProfiles = [18, 16, 22, 20]
let aiCornerSpeedProfiles = [0.72, 0.68, 0.78, 0.74]
let aiRecoveryProfiles = [3400, 3000, 2400, 2800]

/** Returns the stable profile used by both the Garage card and live race. */
function aiRacerProfileForDifficulty(
    difficulty: RaceDifficulty,
    index: number
) {
    let names = beginnerAIRacerNames
    if (difficulty == RaceDifficulty.Intermediate) {
        names = intermediateAIRacerNames
    } else if (difficulty == RaceDifficulty.Expert) {
        names = expertAIRacerNames
    }

    let definition = raceDefinitionForDifficulty(difficulty)
    let speedRange = definition.aiMaximumSpeed - definition.aiMinimumSpeed
    let evenlySpacedSpeed = definition.aiMinimumSpeed +
        speedRange * (index + 1) / (definition.aiCount + 1)
    let profile: AIRacerProfile = {
        name: championshipActive ?
            championshipRivalName(index) : names[index],
        speed: Math.min(
            definition.aiMaximumSpeed,
            evenlySpacedSpeed * aiSpeedProfiles[index]
        ),
        acceleration: aiAccelerationProfiles[index] +
            difficulty * 10,
        steering: aiSteeringProfiles[index],
        cornerSpeed: aiCornerSpeedProfiles[index],
        recoveryMilliseconds: aiRecoveryProfiles[index]
    }
    return profile
}

function aiRacerProfile(index: number) {
    return aiRacerProfileForDifficulty(selectedRace, index)
}

/** Returns the deterministic primary and accent paint for one rival. */
function aiRacerPaintColors(difficulty: RaceDifficulty, racerIndex: number) {
    let colors = [3, 4, 5, 7, 9, 11, 13, 14]
    let firstColorIndex = (difficulty * 3 + racerIndex * 2) % colors.length
    let secondColorIndex = (firstColorIndex + 3 + racerIndex) % colors.length
    return [colors[firstColorIndex], colors[secondColorIndex]]
}

/** Creates one opponent's directional images with a randomized paint scheme. */
function createAIRacerImagesForDifficulty(
    difficulty: RaceDifficulty,
    racerIndex: number
) {
    let definition = raceDefinitionForDifficulty(difficulty)
    let sourceImages = allCarBodyImages[definition.aiBodyTier]
    let racerImages: Image[] = []
    let paintColors = aiRacerPaintColors(difficulty, racerIndex)

    for (let source of sourceImages) {
        let racerImage = source.clone()
        racerImage.replace(
            definition.aiPrimarySourceColor,
            paintColors[0]
        )

        if (definition.aiSecondarySourceColor != 0) {
            racerImage.replace(
                definition.aiSecondarySourceColor,
                paintColors[1]
            )
        }

        racerImages.push(racerImage)
    }

    return racerImages
}

function createAIRacerImages(racerIndex: number) {
    return createAIRacerImagesForDifficulty(selectedRace, racerIndex)
}

/** Selects an opponent's directional image from its strongest velocity axis. */
function updateAIRacerImage(racer: Sprite) {
    let direction = CarImageDirection.Up

    if (Math.abs(racer.vx) > Math.abs(racer.vy)) {
        direction = racer.vx < 0 ? CarImageDirection.Left : CarImageDirection.Right
    } else {
        direction = racer.vy < 0 ? CarImageDirection.Up : CarImageDirection.Down
    }

    if (direction != racer.data.imageDirection) {
        let racerImages: Image[] = racer.data.images
        racer.data.imageDirection = direction
        racer.setImage(racerImages[direction])
    }
}

/** Creates and initializes every opponent for the active race definition. */
function createAIRacers() {
    let startingDirection = raceStartDirection(selectedRaceLayout)
    let reverseGrid = selectedRaceLayout == RaceLayout.Reverse
    let startingColumn = reverseGrid ?
        activeRaceDefinition.playerStartColumn +
            (activeRaceDefinition.playerStartColumn -
                activeRaceDefinition.aiStartColumn) :
        activeRaceDefinition.aiStartColumn

    for (let index = 0; index < activeRaceDefinition.aiCount; index++) {
        let racerImages = createAIRacerImages(index)
        let profile = aiRacerProfile(index)
        let racer = sprites.create(
            racerImages[startingDirection],
            SpriteKind.AIRacer
        )

        racer.data.maximumSpeed = profile.speed
        racer.data.acceleration = profile.acceleration
        racer.data.steering = profile.steering
        racer.data.cornerSpeed = profile.cornerSpeed
        racer.data.recoveryMilliseconds = profile.recoveryMilliseconds
        racer.data.racerName = profile.name
        racer.data.waypoint = 0
        racer.data.checkpointArmed = false
        racer.data.laps = 0
        racer.data.routeGatesPassed = 0
        racer.data.finished = false
        racer.data.finishPlace = 0
        racer.data.lastGateTime = control.millis()
        racer.data.images = racerImages
        racer.data.imageDirection = startingDirection

        // Stagger opponents behind and across the starting lane.
        racer.x =
            (startingColumn + (reverseGrid ? 1 : -1) *
                (index % 2) * 2) * 16 + 8
        racer.y =
            (activeRaceDefinition.aiStartRow + index % 2) * 16 + 8
        racer.z = player.z
        aiRacers.push(racer)
    }
}

/** Steers one opponent toward its current waypoint. */
function updateAIRacer(racer: Sprite, deltaTime: number) {
    if (racer.data.finished) {
        return
    }

    let waypoint: number = racer.data.waypoint
    let targetX = activeAICheckpoints[waypoint][0] * 16 + 8
    let targetY = activeAICheckpoints[waypoint][1] * 16 + 8
    let offsetX = targetX - racer.x
    let offsetY = targetY - racer.y
    let distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY)
    let currentSpeed = Math.sqrt(racer.vx * racer.vx + racer.vy * racer.vy)
    let waypointRadius = Math.max(
        14,
        Math.min(32, currentSpeed * 0.22)
    )

    // A speed-scaled capture radius prevents a fast rival from orbiting a
    // tiny waypoint after it has already made the correct corner approach.
    if (distance < waypointRadius) {
        racer.data.waypoint = (waypoint + 1) % activeAICheckpoints.length
        racer.data.routeGatesPassed += 1
        racer.data.lastGateTime = control.millis()
        return
    }

    let nextWaypoint = (waypoint + 1) % activeAICheckpoints.length
    let nextOffsetX = activeAICheckpoints[nextWaypoint][0] * 16 + 8 - targetX
    let nextOffsetY = activeAICheckpoints[nextWaypoint][1] * 16 + 8 - targetY
    let nextLength = Math.sqrt(
        nextOffsetX * nextOffsetX + nextOffsetY * nextOffsetY
    )
    let cornerAlignment = 1
    if (nextLength > 0 && distance > 0) {
        cornerAlignment = (offsetX * nextOffsetX + offsetY * nextOffsetY) /
            (distance * nextLength)
    }
    let straightness = Math.max(0, Math.min(1, cornerAlignment))
    let targetSpeed = racer.data.maximumSpeed *
        (racer.data.cornerSpeed +
            (1 - racer.data.cornerSpeed) * straightness)

    let directionX = offsetX / distance
    let directionY = offsetY / distance
    for (let other of aiRacers) {
        if (other == racer || other.data.finished) {
            continue
        }
        let separationX = racer.x - other.x
        let separationY = racer.y - other.y
        let separation = Math.sqrt(
            separationX * separationX + separationY * separationY
        )
        if (separation > 0 && separation < 18) {
            let avoidance = (18 - separation) / 18 * 0.55
            directionX += separationX / separation * avoidance
            directionY += separationY / separation * avoidance
        }
    }
    let directionLength = Math.sqrt(
        directionX * directionX + directionY * directionY
    )
    if (directionLength > 0) {
        directionX /= directionLength
        directionY /= directionLength
    }

    let maximumChange = racer.data.acceleration * deltaTime
    if (currentSpeed < targetSpeed) {
        currentSpeed = Math.min(targetSpeed, currentSpeed + maximumChange)
    } else {
        currentSpeed = Math.max(targetSpeed, currentSpeed - maximumChange * 1.5)
    }
    let desiredVX = directionX * currentSpeed
    let desiredVY = directionY * currentSpeed
    let steering = Math.min(1, deltaTime * racer.data.steering)
    racer.vx += (desiredVX - racer.vx) * steering
    racer.vy += (desiredVY - racer.vy) * steering

    if (control.millis() - racer.data.lastGateTime >
        racer.data.recoveryMilliseconds && currentSpeed < 12) {
        let previousWaypoint = (waypoint + activeAICheckpoints.length - 1) %
            activeAICheckpoints.length
        racer.setPosition(
            activeAICheckpoints[previousWaypoint][0] * 16 + 8,
            activeAICheckpoints[previousWaypoint][1] * 16 + 8
        )
        racer.vx = 0
        racer.vy = 0
        racer.data.lastGateTime = control.millis()
        racer.sayText("RECOVER", 500, false)
    }
    updateAIRacerImage(racer)
}

/** Resets and starts the AI subsystem for the active race. */
function startAIRaceSystems() {
    stopAIRaceSystems()
    activeAICheckpoints = activeRaceCheckpoints

    // Validate authored route data once instead of checking every racer frame.
    if (activeAICheckpoints.length == 0) {
        return
    }

    aiRaceSystemsActive = true
    createAIRacers()
}

/** Stops opponent movement and events while keeping sprites for final cleanup. */
function pauseAIRaceSystems() {
    aiRaceSystemsActive = false

    for (let racer of aiRacers) {
        racer.vx = 0
        racer.vy = 0
    }
}

function resumeAIRaceSystems() {
    if (aiRacers.length > 0) {
        aiRaceSystemsActive = true
        for (let racer of aiRacers) {
            racer.data.lastGateTime = control.millis()
        }
    }
}

/** Stops AI updates and destroys all opponents. */
function stopAIRaceSystems() {
    pauseAIRaceSystems()

    for (let racer of aiRacers) {
        racer.destroy()
    }

    aiRacers = []
    activeAICheckpoints = []
}

// Arms an opponent to complete a lap after it crosses the checkpoint.
scene.onOverlapTile(SpriteKind.AIRacer, assets.tile`raceCheckpointTile`, function (racer, location) {
    if (aiRaceSystemsActive) {
        racer.data.checkpointArmed = true
    }
})

// Records an armed opponent lap and ends the race if it finishes first.
scene.onOverlapTile(SpriteKind.AIRacer, assets.tile`raceFinishTile`, function (racer, location) {
    if (!aiRaceSystemsActive || !racer.data.checkpointArmed) {
        return
    }
    let requiredGates = (racer.data.laps + 1) *
        activeAICheckpoints.length
    if (racer.data.routeGatesPassed < requiredGates) {
        return
    }

    racer.data.checkpointArmed = false
    racer.data.laps += 1

    if (racer.data.laps >= activeRaceDefinition.lapTarget) {
        recordAIRacerFinish(racer)
    }
})

game.onUpdate(function () {
    if (!aiRaceSystemsActive) {
        return
    }

    let deltaTime = game.eventContext().deltaTime
    for (let racer of aiRacers) {
        updateAIRacer(racer, deltaTime)
    }
})
