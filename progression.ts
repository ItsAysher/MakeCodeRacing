// Player progression and race-result bookkeeping

let cash = 0
let wins = 0
let racesRaced = 0
let playerName = ""

function newlyUnlockedRaceContent(previousWins: number) {
    if (previousWins < 3 && wins >= 3) {
        return "INTERMEDIATE RACES + FREE ROAM"
    } else if (previousWins < 7 && wins >= 7) {
        return "EXPERT RACES"
    }
    return ""
}

/** Applies one completed race result and returns any newly crossed milestone. */
function recordRaceResult(won: boolean, prizeMoney: number) {
    let previousWins = wins
    racesRaced += 1
    cash += prizeMoney

    if (won) {
        wins += 1
    }

    saveGameProgress()
    return newlyUnlockedRaceContent(previousWins)
}
