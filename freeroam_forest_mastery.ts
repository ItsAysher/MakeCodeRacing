// Forest Free Roam NPC challenges and Boost unlock progression

namespace SpriteKind {
    export let ForestRacerNpc = SpriteKind.create()
    export let ForestMasteryRacer = SpriteKind.create()
}

// These three values are permanent progression. The save system reads and
// writes them; encounter sprites and an active race are deliberately transient.
let forestNpcRaceWins = 0
let forestMasteryCompletedRaceMask = 0
let forestBoostUnlocked = false

let forestMasteryEncounterWorldTileXs: number[] = []
let forestMasteryEncounterWorldTileYs: number[] = []
let forestMasteryNpcSprites: Sprite[] = []
let forestMasterySessionSeed = -1
let forestMasteryPromptOpen = false
let forestMasteryIgnoredEncounter = -1
let forestMasteryRaceActive = false
let forestMasteryRaceFinishing = false
let forestMasteryActiveEncounter = -1
let forestMasteryOpponent: Sprite = null
let forestMasteryOpponentCheckpoints: number[][] = []
let forestMasteryPlayerCheckpointArmed = false
let forestMasteryReturnMap: tiles.TileMapData = null
let forestMasteryReturnPlayerX = 0
let forestMasteryReturnPlayerY = 0
let forestMasteryBlockedMenu = false

let forestMasteryRaceCount = 3

// NPC locations are section centers, so they sit on the guaranteed generated
// trail. Each encounter has several fallbacks in case a river crosses its
// preferred section during this world's seeded generation.
let forestMasteryEncounterCandidateSections: number[][][] = [
    [[4, 0], [4, 1], [3, 0], [5, 0]],
    [[-4, -3], [-5, -3], [-4, -4], [-3, -3]],
    [[2, 5], [1, 5], [3, 5], [2, 6]]
]

let forestMasteryTrackMaps: tiles.TileMapData[] = [
    tilemap`forestNpcRaceTrack1`,
    tilemap`forestNpcRaceTrack2`,
    tilemap`forestNpcRaceTrack3`
]

let forestMasteryPlayerStarts: number[][] = [
    [10, 16],
    [10, 20],
    [12, 26]
]

let forestMasteryOpponentStarts: number[][] = [
    [6, 16],
    [6, 20],
    [8, 26]
]

// The waypoint spacing keeps the B2 opponent centered through every bend.
// Each route includes its visible checkpoint and ends on its finish gate.
let forestMasteryTrackCheckpoints: number[][][] = [
    [
        [15, 16], [23, 16], [27, 13], [27, 7], [23, 3],
        [14, 3], [7, 3], [4, 7], [4, 13], [8, 16], [16, 16]
    ],
    [
        [16, 20], [28, 20], [35, 17], [35, 12], [27, 12],
        [24, 9], [34, 6], [34, 3], [23, 3], [12, 3],
        [12, 8], [5, 8], [5, 16], [12, 16], [16, 20],
        [19, 20]
    ],
    [
        [20, 26], [35, 26], [43, 23], [43, 16], [34, 16],
        [31, 12], [42, 10], [43, 4], [35, 4], [29, 4],
        [27, 9], [20, 9], [18, 4], [6, 4], [4, 9],
        [12, 15], [20, 19], [16, 25], [25, 26]
    ]
]

/** Returns the number of distinct forest challengers already defeated. */
function forestMasteryWinsForSave() {
    return forestNpcRaceWins
}

/** Returns the compact three-bit set of defeated forest challengers. */
function forestMasteryCompletedMaskForSave() {
    return forestMasteryCompletedRaceMask
}

/** Returns whether all three unique victories permanently unlocked Boost. */
function forestMasteryBoostUnlockedForSave() {
    return forestBoostUnlocked
}

/** Counts completed unique encounters without JavaScript-only bit helpers. */
function forestMasteryCountCompletedRaces(mask: number) {
    let completed = 0
    for (let encounter = 0; encounter < forestMasteryRaceCount; encounter++) {
        if (mask & (1 << encounter)) {
            completed += 1
        }
    }
    return completed
}

/** Restores and sanitizes forest mastery values from the browser save. */
function loadForestMasteryProgress(
    savedWins: number,
    completedMask: number,
    boostUnlocked: boolean
) {
    forestMasteryCompletedRaceMask = Math.floor(completedMask) & 7
    let completedCount = forestMasteryCountCompletedRaces(
        forestMasteryCompletedRaceMask
    )
    forestNpcRaceWins = Math.max(
        0,
        Math.min(completedCount, Math.floor(savedWins))
    )
    forestBoostUnlocked = boostUnlocked ||
        forestNpcRaceWins >= forestMasteryRaceCount
}

/** Restores new-game defaults for Player Stats' Reset Progress action. */
function resetForestMasteryProgress() {
    forestNpcRaceWins = 0
    forestMasteryCompletedRaceMask = 0
    forestBoostUnlocked = false
    resetBoostAbility()
}

/** Selects a trail-center encounter location that is not covered by water. */
function chooseForestMasteryEncounterLocations() {
    forestMasteryEncounterWorldTileXs = []
    forestMasteryEncounterWorldTileYs = []

    for (let encounter = 0;
        encounter < forestMasteryEncounterCandidateSections.length;
        encounter++) {
        let candidates = forestMasteryEncounterCandidateSections[encounter]
        let selectedSectionX = candidates[0][0]
        let selectedSectionY = candidates[0][1]

        for (let candidate = 0; candidate < candidates.length; candidate++) {
            let candidateTileX = candidates[candidate][0] *
                freeRoamSectionSize + 4
            let candidateTileY = candidates[candidate][1] *
                freeRoamSectionSize + 4

            if (forestRiverTileKind(candidateTileX, candidateTileY) !=
                ForestRiverTileKind.Water) {
                selectedSectionX = candidates[candidate][0]
                selectedSectionY = candidates[candidate][1]
                break
            }
        }

        forestMasteryEncounterWorldTileXs.push(
            selectedSectionX * freeRoamSectionSize + 4
        )
        forestMasteryEncounterWorldTileYs.push(
            selectedSectionY * freeRoamSectionSize + 4
        )
    }
}

/** Builds a visible B2 placeholder car for a forest challenger. */
function forestMasteryNpcImage(encounter: number) {
    let npcImage = allCarBodyImages[1][CarImageDirection.Right].clone()
    let npcColors = [2, 4, 9]
    npcImage.replace(10, npcColors[encounter])
    return npcImage
}

function destroyForestMasteryNpc(index: number) {
    if (index < forestMasteryNpcSprites.length &&
        forestMasteryNpcSprites[index]) {
        forestMasteryNpcSprites[index].destroy()
        forestMasteryNpcSprites[index] = null
    }
}

function destroyAllForestMasteryNpcs() {
    for (let index = 0; index < forestMasteryNpcSprites.length; index++) {
        destroyForestMasteryNpc(index)
    }
}

/** Places persistent logical NPCs into whichever 3x3 sections are loaded. */
function updateForestMasteryNpcs() {
    for (let encounter = 0;
        encounter < forestMasteryEncounterWorldTileXs.length;
        encounter++) {
        let physicalColumn = forestMasteryEncounterWorldTileXs[encounter] -
            forestCenterWorldSectionX * freeRoamSectionSize +
            freeRoamSectionSize
        let physicalRow = forestMasteryEncounterWorldTileYs[encounter] -
            forestCenterWorldSectionY * freeRoamSectionSize +
            freeRoamSectionSize
        let isLoaded = physicalColumn >= 0 &&
            physicalColumn < freeRoamWindowTileSize &&
            physicalRow >= 0 && physicalRow < freeRoamWindowTileSize

        if (!isLoaded) {
            destroyForestMasteryNpc(encounter)
            continue
        }

        discoverFreeRoamMapActivity(
            FreeRoamTheme.Forest,
            encounter,
            forestMasteryEncounterWorldTileXs[encounter],
            forestMasteryEncounterWorldTileYs[encounter]
        )

        if (encounter >= forestMasteryNpcSprites.length ||
            !forestMasteryNpcSprites[encounter]) {
            let npc = sprites.create(
                forestMasteryNpcImage(encounter),
                SpriteKind.ForestRacerNpc
            )
            npc.data.encounter = encounter
            npc.setFlag(SpriteFlag.GhostThroughWalls, true)
            npc.z = player.z + 1

            while (forestMasteryNpcSprites.length <= encounter) {
                forestMasteryNpcSprites.push(null)
            }
            forestMasteryNpcSprites[encounter] = npc
        }

        forestMasteryNpcSprites[encounter].setPosition(
            physicalColumn * freeRoamTileSize + 8,
            physicalRow * freeRoamTileSize + 8
        )
    }
}

/** Begins or refreshes the encounter layer for a seeded Forest session. */
function startForestMasteryEncounterSystem() {
    forestMasterySessionSeed = forestFreeRoamSeed
    forestMasteryRaceActive = false
    forestMasteryRaceFinishing = false
    forestMasteryPromptOpen = false
    forestMasteryIgnoredEncounter = -1
    forestMasteryNpcSprites = []
    chooseForestMasteryEncounterLocations()
}

/** Removes transient NPC and race state without changing permanent progress. */
function stopForestMasteryEncounterSystem() {
    destroyAllForestMasteryNpcs()
    if (forestMasteryOpponent) {
        forestMasteryOpponent.destroy()
        forestMasteryOpponent = null
    }
    forestMasteryRaceActive = false
    forestMasteryRaceFinishing = false
    forestMasteryPromptOpen = false
    forestMasterySessionSeed = -1
    forestMasteryReturnMap = null
    if (forestMasteryBlockedMenu) {
        freeRoamMenuOpen = false
        forestMasteryBlockedMenu = false
    }
}

/** Creates four cached B2 directions for the active challenger. */
function createForestMasteryOpponentImages(encounter: number) {
    let racerImages: Image[] = []
    let racerColors = [2, 4, 9]

    for (let sourceImage of allCarBodyImages[1]) {
        let racerImage = sourceImage.clone()
        racerImage.replace(10, racerColors[encounter])
        racerImages.push(racerImage)
    }
    return racerImages
}

/** Creates one B2 opponent whose pace scales just below the player's car. */
function createForestMasteryOpponent(encounter: number) {
    let racerImages = createForestMasteryOpponentImages(encounter)
    let racer = sprites.create(
        racerImages[CarImageDirection.Right],
        SpriteKind.ForestMasteryRacer
    )
    let paceMultiplier = 0.84 + encounter * 0.05
    racer.data.maximumSpeed = Math.max(
        45,
        playerMaximumSpeedWithoutBoost() * paceMultiplier
    )
    racer.data.waypoint = 0
    racer.data.checkpointArmed = false
    racer.data.images = racerImages
    racer.data.imageDirection = CarImageDirection.Right
    racer.setPosition(
        forestMasteryOpponentStarts[encounter][0] * 16 + 8,
        forestMasteryOpponentStarts[encounter][1] * 16 + 8
    )
    racer.z = player.z
    return racer
}

/** Steers the forest B2 racer with the same velocity-seeking AI as races. */
function updateForestMasteryOpponent() {
    if (!forestMasteryOpponent ||
        forestMasteryOpponentCheckpoints.length == 0) {
        return
    }

    let waypoint: number = forestMasteryOpponent.data.waypoint
    let target = forestMasteryOpponentCheckpoints[waypoint]
    let offsetX = target[0] * 16 + 8 - forestMasteryOpponent.x
    let offsetY = target[1] * 16 + 8 - forestMasteryOpponent.y
    let distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY)

    if (distance < 10) {
        forestMasteryOpponent.data.waypoint =
            (waypoint + 1) % forestMasteryOpponentCheckpoints.length
        return
    }

    let maximumSpeed: number = forestMasteryOpponent.data.maximumSpeed
    let desiredVX = offsetX * maximumSpeed / distance
    let desiredVY = offsetY * maximumSpeed / distance
    let steering = Math.min(1, game.eventContext().deltaTime * 4)
    forestMasteryOpponent.vx +=
        (desiredVX - forestMasteryOpponent.vx) * steering
    forestMasteryOpponent.vy +=
        (desiredVY - forestMasteryOpponent.vy) * steering
    updateAIRacerImage(forestMasteryOpponent)
}

/** Switches from the streamed forest to one native NPC challenge track. */
function startForestMasteryRace(encounter: number) {
    if (forestMasteryRaceActive || !player) {
        return
    }

    forestMasteryActiveEncounter = encounter
    forestMasteryRaceActive = true
    forestMasteryRaceFinishing = false
    forestMasteryPlayerCheckpointArmed = false
    forestMasteryReturnMap = forestFreeRoamMap
    forestMasteryReturnPlayerX = player.x
    forestMasteryReturnPlayerY = player.y

    // Keep the generator's logical position and seed intact while racing. Its
    // physical window is restored verbatim when the challenge ends.
    forestFreeRoamGenerationActive = false
    destroyAllForestMasteryNpcs()
    if (!freeRoamMenuOpen) {
        freeRoamMenuOpen = true
        forestMasteryBlockedMenu = true
    }

    tiles.setCurrentTilemap(forestMasteryTrackMaps[encounter])
    tiles.placeOnTile(
        player,
        tiles.getTileLocation(
            forestMasteryPlayerStarts[encounter][0],
            forestMasteryPlayerStarts[encounter][1]
        )
    )
    setPlayerCarFacingDirection(CarImageDirection.Right)
    startPlayerMovement()
    forestMasteryOpponentCheckpoints =
        forestMasteryTrackCheckpoints[encounter]
    forestMasteryOpponent = createForestMasteryOpponent(encounter)
    scene.cameraFollowSprite(player)
    game.splash(
        "FOREST CHALLENGE " + (encounter + 1),
        "Beat the B2 racer to the finish!"
    )
}

/** Returns to the exact generated section where the NPC was encountered. */
function restoreForestAfterMasteryRace() {
    if (forestMasteryOpponent) {
        forestMasteryOpponent.destroy()
        forestMasteryOpponent = null
    }

    forestMasteryOpponentCheckpoints = []
    tiles.setCurrentTilemap(forestMasteryReturnMap)
    forestFreeRoamMap = forestMasteryReturnMap
    forestFreeRoamGenerationActive = true
    player.setPosition(
        forestMasteryReturnPlayerX,
        forestMasteryReturnPlayerY
    )
    startPlayerMovement()
    if (playerCarVisual) {
        playerCarVisual.setPosition(player.x, player.y)
    }
    scene.cameraFollowSprite(player)

    if (forestMasteryBlockedMenu) {
        freeRoamMenuOpen = false
        forestMasteryBlockedMenu = false
    }
    forestMasteryIgnoredEncounter = forestMasteryActiveEncounter
    forestMasteryRaceActive = false
    forestMasteryRaceFinishing = false
    forestMasteryPromptOpen = false
    forestMasteryReturnMap = null
}

/** Records a unique victory and unlocks Boost after all three challenges. */
function completeForestMasteryRace(playerWon: boolean) {
    if (!forestMasteryRaceActive || forestMasteryRaceFinishing) {
        return
    }

    forestMasteryRaceFinishing = true
    player.vx = 0
    player.vy = 0
    if (forestMasteryOpponent) {
        forestMasteryOpponent.vx = 0
        forestMasteryOpponent.vy = 0
    }

    story.startCutscene(function () {
        if (playerWon) {
            let raceBit = 1 << forestMasteryActiveEncounter
            let firstVictory =
                (forestMasteryCompletedRaceMask & raceBit) == 0
            if (firstVictory) {
                forestMasteryCompletedRaceMask |= raceBit
                forestNpcRaceWins += 1
            }

            game.splash(
                "CHALLENGE WON!",
                firstVictory ?
                    "Forest victories: " + forestNpcRaceWins + "/3" :
                    "Practice victory recorded."
            )

            if (forestNpcRaceWins >= 3 && !forestBoostUnlocked) {
                forestNpcRaceWins = 3
                forestBoostUnlocked = true
                game.splash(
                    "BOOST UNLOCKED",
                    "Press J in any Free Roam for a short 1.5x speed boost."
                )
            }
            saveGameProgress()
        } else {
            game.splash(
                "CHALLENGE LOST",
                "Find this racer again when you are ready for a rematch."
            )
        }

        restoreForestAfterMasteryRace()
    })
}

sprites.onOverlap(
    SpriteKind.Player,
    SpriteKind.ForestRacerNpc,
    function (playerSprite, npc) {
        if (forestMasteryRaceActive || forestMasteryPromptOpen ||
            drivingSessionState != DrivingSessionState.FreeRoam ||
            selectedFreeRoamTheme != FreeRoamTheme.Forest) {
            return
        }

        let encounter: number = npc.data.encounter
        if (encounter == forestMasteryIgnoredEncounter) {
            return
        }

        forestMasteryPromptOpen = true
        forestMasteryIgnoredEncounter = encounter
        player.vx = 0
        player.vy = 0
        story.startCutscene(function () {
            let completed =
                (forestMasteryCompletedRaceMask & (1 << encounter)) != 0
            story.printCharacterText(
                completed ?
                    "Want another run on my forest course?" :
                    "Beat me on my forest course and earn a Boost victory."
            )
            story.showPlayerChoices("Race", "Not now")

            if (story.checkLastAnswer("Race")) {
                startForestMasteryRace(encounter)
            } else {
                forestMasteryPromptOpen = false
            }
        })
    }
)

scene.onOverlapTile(
    SpriteKind.Player,
    assets.tile`raceCheckpointTile`,
    function (sprite, location) {
        if (forestMasteryRaceActive && !forestMasteryRaceFinishing) {
            forestMasteryPlayerCheckpointArmed = true
        }
    }
)

scene.onOverlapTile(
    SpriteKind.Player,
    assets.tile`raceFinishTile`,
    function (sprite, location) {
        if (forestMasteryRaceActive && !forestMasteryRaceFinishing &&
            forestMasteryPlayerCheckpointArmed) {
            forestMasteryPlayerCheckpointArmed = false
            completeForestMasteryRace(true)
        }
    }
)

scene.onOverlapTile(
    SpriteKind.ForestMasteryRacer,
    assets.tile`raceCheckpointTile`,
    function (racer, location) {
        if (forestMasteryRaceActive && !forestMasteryRaceFinishing) {
            racer.data.checkpointArmed = true
        }
    }
)

scene.onOverlapTile(
    SpriteKind.ForestMasteryRacer,
    assets.tile`raceFinishTile`,
    function (racer, location) {
        if (forestMasteryRaceActive && !forestMasteryRaceFinishing &&
            racer.data.checkpointArmed) {
            racer.data.checkpointArmed = false
            completeForestMasteryRace(false)
        }
    }
)

game.onUpdate(function () {
    if (forestMasteryRaceActive) {
        if (drivingSessionState != DrivingSessionState.FreeRoam || !player) {
            stopForestMasteryEncounterSystem()
            return
        }
        if (!forestMasteryRaceFinishing) {
            updateForestMasteryOpponent()
        }
        return
    }

    if (drivingSessionState != DrivingSessionState.FreeRoam ||
        selectedFreeRoamTheme != FreeRoamTheme.Forest ||
        !forestFreeRoamGenerationActive || !player) {
        if (forestMasterySessionSeed >= 0) {
            stopForestMasteryEncounterSystem()
        }
        return
    }

    if (forestMasterySessionSeed != forestFreeRoamSeed) {
        stopForestMasteryEncounterSystem()
        startForestMasteryEncounterSystem()
    }

    updateForestMasteryNpcs()

    if (forestMasteryIgnoredEncounter >= 0 &&
        forestMasteryIgnoredEncounter < forestMasteryNpcSprites.length) {
        let ignoredNpc =
            forestMasteryNpcSprites[forestMasteryIgnoredEncounter]
        if (!ignoredNpc ||
            Math.abs(ignoredNpc.x - player.x) > 24 ||
            Math.abs(ignoredNpc.y - player.y) > 24) {
            forestMasteryIgnoredEncounter = -1
        }
    }
})
