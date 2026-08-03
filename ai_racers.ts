let aiRaceSystemsActive = false
let aiRacers: Sprite[] = []

// Ordered tile locations that keep each opponent near the center of the road.
// The last location must lead back through the finish line to the first one.
let beginnerAICheckpoints = [
    [25, 14],
    [25, 5],
    [4, 5],
    [4, 14]
]
let intermediateAICheckpoints = [
    [44, 28],
    [44, 23],
    [31, 23],
    [31, 16],
    [44, 16],
    [44, 7],
    [7, 7],
    [7, 11],
    [14, 18],
    [6, 23],
    [7, 28]
]
let expertAICheckpoints = [
    [65, 46],
    [65, 36],
    [51, 36],
    [51, 27],
    [66, 27],
    [66, 4],
    [53, 4],
    [53, 18],
    [44, 18],
    [44, 4],
    [27, 4],
    [35, 11],
    [31, 18],
    [17, 5],
    [3, 5],
    [3, 12],
    [25, 30],
    [25, 37],
    [15, 39],
    [11, 29],
    [4, 29],
    [4, 46]
]

function aiCheckpointsForSelectedRace() {
    if (selectedRace == RaceDifficulty.Expert) {
        return expertAICheckpoints
    } else if (selectedRace == RaceDifficulty.Intermediate) {
        return intermediateAICheckpoints
    }
    return beginnerAICheckpoints
}

function aiStartingColumn() {
    if (selectedRace == RaceDifficulty.Expert) {
        return 32
    }
    return 8
}

function aiStartingRow() {
    if (selectedRace == RaceDifficulty.Expert) {
        return 45
    } else if (selectedRace == RaceDifficulty.Intermediate) {
        return 28
    }
    return 14
}

// These speeds sit below the approximate maximum speed of the matching car
// build: starter 55, intermediate 95, and expert 150.
function aiSpeedForSelectedRace() {
    if (selectedRace == RaceDifficulty.Expert) {
        return randint(80, 110)
    } else if (selectedRace == RaceDifficulty.Intermediate) {
        return randint(50, 70)
    }
    return randint(20, 50)
}

function aiCountForSelectedRace() {
    if (selectedRace == RaceDifficulty.Expert) {
        return 4
    } else if (selectedRace == RaceDifficulty.Intermediate) {
        return 3
    }
    return 2
}

function aiBodyImages() {
    if (selectedRace == RaceDifficulty.Expert) {
        return carBody3Images
    } else if (selectedRace == RaceDifficulty.Intermediate) {
        return carBody2Images
    }
    return carBody1Images
}

/**
 * Clones the body images for one opponent and applies a randomized paint scheme.
 * The selected difficulty determines both the body tier and colors replaced.
 * @returns Directional images ordered up, down, left, and right.
 */
function createAIRacerImages() {
    let sourceImages = aiBodyImages()
    let racerImages: Image[] = []
    let colors = [3, 4, 5, 7, 9, 11, 13, 14]
    let firstColorIndex = randint(0, colors.length - 1)
    let secondColorIndex = (firstColorIndex + randint(1, colors.length - 1)) % colors.length

    for (let source of sourceImages) {
        let racerImage = source.clone()

        if (selectedRace == RaceDifficulty.Expert) {
            racerImage.replace(2, colors[firstColorIndex])
        } else if (selectedRace == RaceDifficulty.Intermediate) {
            racerImage.replace(10, colors[firstColorIndex])
            racerImage.replace(12, colors[secondColorIndex])
        } else {
            racerImage.replace(8, colors[firstColorIndex])
            racerImage.replace(6, colors[secondColorIndex])
        }

        racerImages.push(racerImage)
    }

    return racerImages
}

/**
 * Selects an opponent's directional image from its strongest velocity axis.
 * @param racer The AI racer whose appearance should follow its movement.
 */
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

/**
 * Creates and initializes every opponent required by the selected difficulty.
 * Opponents receive independent speed rolls, image sets, and race progress.
 */
function createAIRacers() {
    let count = aiCountForSelectedRace()
    let startingColumn = aiStartingColumn()
    let startingRow = aiStartingRow()

    for (let index = 0; index < count; index++) {
        let racerImages = createAIRacerImages()
        let racer = sprites.create(racerImages[CarImageDirection.Right], SpriteKind.AIRacer)

        racer.data.maximumSpeed = aiSpeedForSelectedRace()
        racer.data.waypoint = 0
        racer.data.checkpointArmed = false
        racer.data.laps = 0
        racer.data.images = racerImages
        racer.data.imageDirection = CarImageDirection.Right

        // Stagger opponents behind and across the starting lane so none begin
        // overlapping the player.
        racer.x = (startingColumn - index % 2 * 2) * 16 + 8
        racer.y = (startingRow + index % 2) * 16 + 8
        racer.z = player.z
        aiRacers.push(racer)
    }
}

/**
 * Steers an opponent toward its current waypoint and advances the route on arrival.
 * Velocity is blended instead of replaced so opponents turn smoothly.
 * @param racer The opponent to update.
 * @param deltaTime Seconds elapsed since the previous frame.
 */
function updateAIRacer(racer: Sprite, deltaTime: number) {
    let checkpoints = aiCheckpointsForSelectedRace()
    if (checkpoints.length == 0) {
        racer.vx = 0
        racer.vy = 0
        return
    }

    let waypoint: number = racer.data.waypoint
    let targetX = checkpoints[waypoint][0] * 16 + 8
    let targetY = checkpoints[waypoint][1] * 16 + 8
    let offsetX = targetX - racer.x
    let offsetY = targetY - racer.y
    let distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY)

    if (distance < 10) {
        // Wrapping to zero starts the same ordered route for the next lap.
        racer.data.waypoint = (waypoint + 1) % checkpoints.length
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

/**
 * Resets and starts the AI subsystem for a new race.
 */
function startAIRaceSystems() {
    // startNextRace is the only caller; stop first so restarting never leaves
    // racers from the previous race.
    stopAIRaceSystems()
    aiRaceSystemsActive = true
    createAIRacers()
}

/**
 * Stops AI updates and destroys all opponents from the previous race.
 */
function stopAIRaceSystems() {
    aiRaceSystemsActive = false

    for (let racer of aiRacers) {
        racer.destroy()
    }
    aiRacers = []

}

// Arms an opponent to complete a lap after it reaches the finish line.
scene.onOverlapTile(SpriteKind.AIRacer, assets.tile`raceCheckpointTile`, function (racer, location) {
    if (aiRaceSystemsActive) {
        racer.data.checkpointArmed = true
    }
})

// Records an armed opponent lap and ends the race if it reaches the lap target.
scene.onOverlapTile(SpriteKind.AIRacer, assets.tile`raceFinishTile`, function (racer, location) {
    if (!aiRaceSystemsActive || !racer.data.checkpointArmed) {
        return
    }

    racer.data.checkpointArmed = false
    racer.data.laps += 1

    if (racer.data.laps >= raceLapTarget) {
        completeCurrentRace(false)
    }
})

// Updates active opponents every frame using the current frame duration.
game.onUpdate(function () {
    if (!aiRaceSystemsActive) {
        return
    }

    let deltaTime = game.eventContext().deltaTime
    for (let racer of aiRacers) {
        updateAIRacer(racer, deltaTime)
    }
})
