let aiRaceSystemsActive = false
let aiRacers: Sprite[] = []

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

function createAIRacerImage(color: number) {
    // Copying the equipped player body gives opponents the same authored car
    // silhouette without introducing another set of placeholder assets.
    let racerImage = player.image.clone()
    racerImage.replace(2, color)
    racerImage.replace(4, color)
    return racerImage
}

function createAIRacers() {
    let count = aiCountForSelectedRace()

    for (let index = 0; index < count; index++) {
        let racer = sprites.create(
            createAIRacerImage(3 + index * 2),
            SpriteKind.AIRacer
        )

        racer.data.maximumSpeed = aiSpeedForSelectedRace()
        racer.data.waypoint = 0
        racer.data.checkpointArmed = false
        racer.data.laps = 0

        // Stagger opponents behind and across the starting lane so none begin
        // overlapping the player.
        racer.x = (8 - index % 2 * 2) * 16 + 8
        racer.y = (14 + index % 2) * 16 + 8
        racer.z = player.z
        aiRacers.push(racer)
    }
}

function updateAIRacer(racer: Sprite, deltaTime: number) {
    // Waypoints follow the center of the rectangular authored race loop:
    // bottom-right, top-right, top-left, bottom-left.
    let waypointColumns = [25, 25, 4, 4]
    let waypointRows = [14, 5, 5, 14]
    let waypoint: number = racer.data.waypoint
    let targetX = waypointColumns[waypoint] * 16 + 8
    let targetY = waypointRows[waypoint] * 16 + 8
    let offsetX = targetX - racer.x
    let offsetY = targetY - racer.y
    let distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY)

    if (distance < 10) {
        racer.data.waypoint = (waypoint + 1) % waypointColumns.length
        return
    }

    let maximumSpeed = racer.data.maximumSpeed
    let desiredVX = offsetX * maximumSpeed / distance
    let desiredVY = offsetY * maximumSpeed / distance
    let steering = Math.min(1, deltaTime * 4)

    racer.vx += (desiredVX - racer.vx) * steering
    racer.vy += (desiredVY - racer.vy) * steering
}

function startAIRaceSystems() {
    // startNextRace is the only caller; stop first so restarting never leaves
    // racers from the previous race.
    stopAIRaceSystems()
    aiRaceSystemsActive = true
    createAIRacers()
}

function stopAIRaceSystems() {
    aiRaceSystemsActive = false

    for (let racer of aiRacers) {
        racer.destroy()
    }
    aiRacers = []

}

scene.onOverlapTile(SpriteKind.AIRacer, assets.tile`raceCheckpointTile`, function (racer, location) {
    if (aiRaceSystemsActive) {
        racer.data.checkpointArmed = true
    }
})

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

game.onUpdate(function () {
    if (!aiRaceSystemsActive) {
        return
    }

    let deltaTime = game.eventContext().deltaTime
    for (let racer of aiRacers) {
        updateAIRacer(racer, deltaTime)
    }
})
