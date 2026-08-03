// Race opponent creation, navigation, rendering, and lap progress

let aiRaceSystemsActive = false
let aiRacers: Sprite[] = []
let activeAICheckpoints: number[][] = []

/** Creates one opponent's directional images with a randomized paint scheme. */
function createAIRacerImages() {
    let sourceImages = allCarBodyImages[activeRaceDefinition.aiBodyTier]
    let racerImages: Image[] = []
    let colors = [3, 4, 5, 7, 9, 11, 13, 14]
    let firstColorIndex = randint(0, colors.length - 1)
    let secondColorIndex =
        (firstColorIndex + randint(1, colors.length - 1)) % colors.length

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
        let racerImages = createAIRacerImages()
        let racer = sprites.create(
            racerImages[CarImageDirection.Right],
            SpriteKind.AIRacer
        )

        racer.data.maximumSpeed = randint(
            activeRaceDefinition.aiMinimumSpeed,
            activeRaceDefinition.aiMaximumSpeed
        )
        racer.data.waypoint = 0
        racer.data.checkpointArmed = false
        racer.data.laps = 0
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
    let waypoint: number = racer.data.waypoint
    let targetX = activeAICheckpoints[waypoint][0] * 16 + 8
    let targetY = activeAICheckpoints[waypoint][1] * 16 + 8
    let offsetX = targetX - racer.x
    let offsetY = targetY - racer.y
    let distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY)

    if (distance < 10) {
        racer.data.waypoint = (waypoint + 1) % activeAICheckpoints.length
        return
    }

    let maximumSpeed = racer.data.maximumSpeed
    let desiredVX = offsetX * maximumSpeed / distance
    let desiredVY = offsetY * maximumSpeed / distance
    let steering = Math.min(1, deltaTime * 4)

    racer.vx += (desiredVX - racer.vx) * steering
    racer.vy += (desiredVY - racer.vy) * steering
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

    racer.data.checkpointArmed = false
    racer.data.laps += 1

    if (racer.data.laps >= activeRaceDefinition.lapTarget) {
        completeCurrentRace(false)
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
