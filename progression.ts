// Player progression and race-result bookkeeping

let cash = 0
let wins = 0
let racesRaced = 0

/** Applies one completed race result to the player's session progression. */
function recordRaceResult(won: boolean, prizeMoney: number) {
    racesRaced += 1
    cash += prizeMoney

    if (won) {
        wins += 1
    }

    saveGameProgress()
}
