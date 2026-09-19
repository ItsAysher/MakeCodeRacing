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

function aiRacerProfile(index: number) {
    let names = beginnerAIRacerNames
    if (selectedRace == RaceDifficulty.Intermediate) {
        names = intermediateAIRacerNames
    } else if (selectedRace == RaceDifficulty.Expert) {
        names = expertAIRacerNames
    }

    let speedRange = activeRaceDefinition.aiMaximumSpeed -
        activeRaceDefinition.aiMinimumSpeed
    let evenlySpacedSpeed = activeRaceDefinition.aiMinimumSpeed +
        speedRange * (index + 1) / (activeRaceDefinition.aiCount + 1)
    let profile: AIRacerProfile = {
        name: names[index],
        speed: Math.min(
            activeRaceDefinition.aiMaximumSpeed,
            evenlySpacedSpeed * aiSpeedProfiles[index]
        ),
        acceleration: aiAccelerationProfiles[index] +
            selectedRaceIndex() * 10,
        steering: aiSteeringProfiles[index],
        cornerSpeed: aiCornerSpeedProfiles[index],
        recoveryMilliseconds: aiRecoveryProfiles[index]
    }
    return profile
}

/** Creates one opponent's directional images with a randomized paint scheme. */
function createAIRacerImages(racerIndex: number) {
    let sourceImages = allCarBodyImages[activeRaceDefinition.aiBodyTier]
    let racerImages: Image[] = []
    let colors = [3, 4, 5, 7, 9, 11, 13, 14]
    let firstColorIndex = (selectedRaceIndex() * 3 + racerIndex * 2) %
        colors.length
    let secondColorIndex = (firstColorIndex + 3 + racerIndex) % colors.length

    for (let source of sourceImages) {
        let racerImage = source.clone()
        racerImage.replace(
            activeRaceDefinition.aiPrimarySourceColor,
            colors[firstColorIndex]
        )

        if (activeRaceDefinition.aiSecondarySourceColor != 0) {
            racerImage.replace(
                activeRaceDefinition.aiSecondarySourceColor,
                colors[secondColorIndex]
            )
        }

        racerImages.push(racerImage)
    }

    return racerImages
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
    for (let index = 0; index < activeRaceDefinition.aiCount; index++) {
        let racerImages = createAIRacerImages(index)
        let profile = aiRacerProfile(index)
        let racer = sprites.create(
            racerImages[CarImageDirection.Right],
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
        racer.data.imageDirection = CarImageDirection.Right

        // Stagger opponents behind and across the starting lane.
        racer.x =
            (activeRaceDefinition.aiStartColumn - index % 2 * 2) * 16 + 8
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
    activeAICheckpoints = activeRaceDefinition.aiCheckpoints

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
