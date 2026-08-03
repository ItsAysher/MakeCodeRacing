// Authored track configuration shared by race and AI systems

enum RaceDifficulty {
    Beginner,
    Intermediate,
    Expert
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
    timeLimit: 40,
    playerStartColumn: 11,
    playerStartRow: 14,
    aiStartColumn: 8,
    aiStartRow: 14,
    aiMinimumSpeed: 20,
    aiMaximumSpeed: 50,
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
    timeLimit: 55,
    playerStartColumn: 11,
    playerStartRow: 28,
    aiStartColumn: 8,
    aiStartRow: 28,
    aiMinimumSpeed: 50,
    aiMaximumSpeed: 70,
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
    timeLimit: 120,
    playerStartColumn: 35,
    playerStartRow: 45,
    aiStartColumn: 32,
    aiStartRow: 45,
    aiMinimumSpeed: 80,
    aiMaximumSpeed: 110,
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

function raceDefinitionForDifficulty(difficulty: RaceDifficulty) {
    if (difficulty == RaceDifficulty.Expert) {
        return expertRaceDefinition
    } else if (difficulty == RaceDifficulty.Intermediate) {
        return intermediateRaceDefinition
    }
    return beginnerRaceDefinition
}
