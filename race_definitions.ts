// Authored track configuration shared by race and AI systems

enum RaceDifficulty {
    Beginner,
    Intermediate,
    Expert
}

enum RaceLayout {
    Forward,
    Reverse
}

interface RaceDefinition {
    name: string
    map: tiles.TileMapData
    lapTarget: number
    prize: number
    timeLimit: number
    playerStartColumn: number
    playerStartRow: number
    aiStartColumn: number
    aiStartRow: number
    aiMinimumSpeed: number
    aiMaximumSpeed: number
    aiCount: number
    aiBodyTier: number
    aiPrimarySourceColor: number
    aiSecondarySourceColor: number
    aiCheckpoints: number[][]
}

let beginnerRaceDefinition: RaceDefinition = {
    name: "BEGINNER",
    map: tilemap`beginnerRaceMap`,
    lapTarget: 1,
    prize: 100,
    timeLimit: 45,
    playerStartColumn: 11,
    playerStartRow: 14,
    aiStartColumn: 8,
    aiStartRow: 14,
    aiMinimumSpeed: 25,
    aiMaximumSpeed: 55,
    aiCount: 2,
    aiBodyTier: 0,
    aiPrimarySourceColor: 8,
    aiSecondarySourceColor: 6,
    aiCheckpoints: [
        [25, 14],
        [25, 5],
        [4, 5],
        [4, 14]
    ]
}

let intermediateRaceDefinition: RaceDefinition = {
    name: "INTERMEDIATE",
    map: tilemap`intermediateRaceMap`,
    lapTarget: 2,
    prize: 500,
    timeLimit: 100,
    playerStartColumn: 11,
    playerStartRow: 28,
    aiStartColumn: 8,
    aiStartRow: 28,
    aiMinimumSpeed: 70,
    aiMaximumSpeed: 115,
    aiCount: 3,
    aiBodyTier: 1,
    aiPrimarySourceColor: 10,
    aiSecondarySourceColor: 12,
    aiCheckpoints: [
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
}

let expertRaceDefinition: RaceDefinition = {
    name: "EXPERT",
    map: tilemap`expertRaceMap`,
    lapTarget: 3,
    prize: 1300,
    timeLimit: 210,
    playerStartColumn: 35,
    playerStartRow: 45,
    aiStartColumn: 32,
    aiStartRow: 45,
    aiMinimumSpeed: 110,
    aiMaximumSpeed: 165,
    aiCount: 4,
    aiBodyTier: 2,
    aiPrimarySourceColor: 2,
    aiSecondarySourceColor: 0,
    aiCheckpoints: [
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
}

let selectedRace = RaceDifficulty.Beginner
let selectedRaceLayout = RaceLayout.Forward

function raceLayoutLabel(layout: RaceLayout) {
    return layout == RaceLayout.Reverse ? "REVERSE" : "FORWARD"
}

function raceLayoutShortLabel(layout: RaceLayout) {
    return layout == RaceLayout.Reverse ? "REV" : "FWD"
}

function raceStartDirection(layout: RaceLayout) {
    return layout == RaceLayout.Reverse ?
        CarImageDirection.Left : CarImageDirection.Right
}

/**
 * Returns the authored loop in travel order. Reversing the gate list makes
 * the first reverse gate the near-grid gate at the other end of the starting
 * straight, while retaining every authored corner and the physical finish.
 */
function raceCheckpointsForLayout(
    definition: RaceDefinition,
    layout: RaceLayout
) {
    if (layout == RaceLayout.Forward) {
        return definition.aiCheckpoints
    }

    let reversedCheckpoints: number[][] = []
    for (let index = definition.aiCheckpoints.length - 1;
        index >= 0;
        index--) {
        reversedCheckpoints.push(definition.aiCheckpoints[index])
    }
    return reversedCheckpoints
}

function raceDefinitionForDifficulty(difficulty: RaceDifficulty) {
    if (difficulty == RaceDifficulty.Expert) {
        return expertRaceDefinition
    } else if (difficulty == RaceDifficulty.Intermediate) {
        return intermediateRaceDefinition
    }
    return beginnerRaceDefinition
}
