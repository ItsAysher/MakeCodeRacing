// Three-event championship series, points, standings, and podium flow

const championshipEventCount = 3
const championshipWinnerBonus = 1000
let championshipActive = false
let championshipRound = 0
let championshipPlayerPoints = 0
let championshipRivalPoints = [0, 0, 0, 0]
let championshipRivalNames = ["MOSS", "EMBER", "NOVA", "CROWN"]

function championshipPointsForPlace(position: number) {
    if (position == 1) {
        return 10
    } else if (position == 2) {
        return 7
    } else if (position == 3) {
        return 5
    } else if (position == 4) {
        return 3
    } else if (position == 5) {
        return 1
    }
    return 0
}

function championshipRivalName(index: number) {
    return championshipRivalNames[index]
}

function championshipRoundLabel() {
    return "ROUND " + (championshipRound + 1) + "/" +
        championshipEventCount
}

function resetChampionshipProgress() {
    championshipActive = false
    championshipRound = 0
    championshipPlayerPoints = 0
    championshipRivalPoints = [0, 0, 0, 0]
}

/** Starts a fresh series after all three normal circuits are unlocked. */
function startChampionshipSeries() {
    championshipActive = true
    championshipRound = 0
    championshipPlayerPoints = 0
    championshipRivalPoints = [0, 0, 0, 0]
    selectedRace = RaceDifficulty.Beginner
    selectedRaceLayout = RaceLayout.Forward
    selectedDrivingMode = DrivingMode.Race
    garageIsOpen = false
}

/** Prevents a normal Garage selection from inheriting championship state. */
function cancelChampionshipSeries() {
    if (championshipActive) {
        resetChampionshipProgress()
    }
}

function championshipAIRouteScore(racer: Sprite) {
    return racer.data.routeGatesPassed +
        routeGateFraction(racer, racer.data.waypoint)
}

/** Resolves an AI place from finish order first, then current route progress. */
function championshipPlaceForAIRacer(
    racer: Sprite,
    playerCompleted: boolean
) {
    if (racer.data.finished) {
        return racer.data.finishPlace
    }

    let place = 1
    let racerProgress = championshipAIRouteScore(racer)
    for (let other of aiRacers) {
        if (other == racer) {
            continue
        }
        if (other.data.finished ||
            championshipAIRouteScore(other) > racerProgress) {
            place += 1
        }
    }

    if (playerCompleted) {
        // Every unfinished rival is behind the classified player.
        place += 1
    }
    return place
}

/** Awards the current field before any race sprites are destroyed. */
function recordChampionshipRound(
    playerPosition: number,
    playerCompleted: boolean
) {
    if (!championshipActive) {
        return
    }

    // A timeout or wreck is a DNF: rivals are classified, but the player
    // cannot earn championship points from an unfinished route position.
    if (playerCompleted) {
        championshipPlayerPoints +=
            championshipPointsForPlace(playerPosition)
    }
    for (let index = 0; index < aiRacers.length; index++) {
        let rivalPlace = championshipPlaceForAIRacer(
            aiRacers[index],
            playerCompleted
        )
        championshipRivalPoints[index] +=
            championshipPointsForPlace(rivalPlace)
    }
}

function championshipStandingName(index: number) {
    return index == 0 ? playerName : championshipRivalNames[index - 1]
}

function championshipStandingPoints(index: number) {
    return index == 0 ? championshipPlayerPoints :
        championshipRivalPoints[index - 1]
}

/** Builds a stable points-sorted table without relying on Array.sort. */
function championshipStandingsText(title: string, maximumRows: number) {
    let used = [false, false, false, false, false]
    let text = title
    for (let row = 0; row < maximumRows; row++) {
        let bestIndex = -1
        let bestPoints = -1
        for (let index = 0; index < 5; index++) {
            let points = championshipStandingPoints(index)
            if (!used[index] &&
                (points > bestPoints ||
                    (points == bestPoints && bestIndex == 0 &&
                        index != 0))) {
                bestIndex = index
                bestPoints = points
            }
        }
        if (bestIndex < 0) {
            break
        }
        used[bestIndex] = true
        text += "\n" + (row + 1) + ". " +
            championshipStandingName(bestIndex) +
            "  " + bestPoints + " PTS"
    }
    return text
}

function showChampionshipRoundStandings() {
    game.showLongText(
        championshipStandingsText(
            "CHAMPIONSHIP " + championshipRoundLabel(),
            5
        ),
        DialogLayout.Full
    )
}

function championshipPlayerIsLeader() {
    for (let points of championshipRivalPoints) {
        if (points >= championshipPlayerPoints) {
            return false
        }
    }
    return true
}

/** Advances to the next circuit, returning false after the final podium. */
function advanceChampionshipSeries() {
    championshipRound += 1
    if (championshipRound < championshipEventCount) {
        selectedRace = championshipRound as RaceDifficulty
        return true
    }

    let wonSeries = championshipPlayerIsLeader()
    let finale = image.create(160, 120)
    finale.fill(wonSeries ? 5 : 12)
    finale.drawTransparentImage(assets.image`champion-trophy-icon`, 76, 18)
    scene.setBackgroundImage(finale)
    game.splash(
        wonSeries ? "CHAMPION!" : "SERIES COMPLETE",
        wonSeries ? "You topped the points table" :
            "Return stronger next season"
    )
    game.showLongText(
        championshipStandingsText(
            wonSeries ? "CHAMPIONSHIP WINNER" : "FINAL PODIUM",
            3
        ) +
        (wonSeries ?
            "\nChampion bonus: $" + championshipWinnerBonus :
            "\nReplay the series from the Garage."),
        DialogLayout.Full
    )
    if (wonSeries) {
        cash += championshipWinnerBonus
        saveGameProgress()
    }
    resetChampionshipProgress()
    return false
}

function showChampionshipBriefing() {
    game.showLongText(
        "THREE-CIRCUIT CHAMPIONSHIP" +
        "\nBeginner > Intermediate > Expert" +
        "\nPoints: 10 / 7 / 5 / 3 / 1" +
        "\nDNF: 0 | Points ties favor the field" +
        "\nChampion bonus: $" + championshipWinnerBonus +
        "\nNo rematches between rounds.",
        DialogLayout.Full
    )
    story.showPlayerChoices("Start Series", "Back")
    if (story.checkLastAnswer("Start Series")) {
        startChampionshipSeries()
    }
}
