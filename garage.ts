// Main Garage navigation

/** Displays persistent player progression. */
function showPlayerStats() {
    let winRate = racesRaced > 0 ?
        Math.idiv(wins * 100, racesRaced) : 0
    game.showLongText(
        "Cash: $" + cash +
        "\nWins: " + wins +
        "\nTotal Races: " + racesRaced +
        "\nWin Rate: " + winRate + "%" +
        "\nVersion: " + racingGameVersion,
        DialogLayout.Bottom
    )
}

function countOwnedItems(values: boolean[]) {
    let owned = 0
    for (let value of values) {
        if (value) {
            owned += 1
        }
    }
    return owned
}

function showCareerProgress() {
    let ownedParts = countOwnedItems(engineUnlocked) +
        countOwnedItems(wheelsUnlocked) +
        countOwnedItems(bodyUnlocked) +
        countOwnedItems(brakesUnlocked)
    let ownedPaints = countOwnedItems(paintColorsUnlocked)
    let forestCompleted = forestMasteryCountCompletedRaces(
        forestMasteryCompletedRaceMask
    )
    let highwayCompleted = highwayCompletedDriftChallengeCount()
    let caveCompleted = caveMasteryReturnedCountForSave()
    let abilities = (forestBoostUnlocked ? 1 : 0) +
        (highwayDriftUnlocked ? 1 : 0) +
        (caveTeleportUnlocked ? 1 : 0)
    let records = 0
    for (let index = 0; index < 3; index++) {
        if (bestRaceTimeMilliseconds[index] > 0) {
            records += 1
        }
    }
    let completedPoints = ownedParts + ownedPaints +
        forestCompleted + highwayCompleted + caveCompleted +
        abilities + records
    let maximumPoints = 12 + 15 + 9 + 3 + 3
    let completionPercent = Math.idiv(
        completedPoints * 100,
        maximumPoints
    )

    let nextUnlock = wins < 3 ?
        (3 - wins) + " win(s) to Intermediate + Free Roam" :
        (wins < 7 ? (7 - wins) + " win(s) to Expert" :
            "All driving modes unlocked")
    game.showLongText(
        "CAREER " + completionPercent + "%" +
        "\n" + nextUnlock +
        "\nParts: " + ownedParts + "/12" +
        "\nPaints: " + ownedPaints + "/15" +
        "\nRace records: " + records + "/3" +
        "\nForest rivals: " + forestCompleted + "/3" +
        "\nHighway trials: " + highwayCompleted + "/3" +
        "\nCave statues: " + caveCompleted + "/3" +
        "\nAbilities: " + abilities + "/3",
        DialogLayout.Full
    )
}

/** Confirms and performs a complete persistent-progress reset. */
function confirmResetProgress() {
    story.printCharacterText("Are you sure? All progress will be erased")
    story.showPlayerChoices("Reset Progress", "Cancel")

    if (story.checkLastAnswer("Reset Progress")) {
        resetGameProgress()
        story.printCharacterText("Progress has been reset.")
    }
}

/** Runs the Player Stats submenu until the player returns to the Garage. */
function showPlayerStatsMenu() {
    let leaveStatsMenu = false

    while (!leaveStatsMenu && garageIsOpen) {
        setGarageBackground(GarageBackground.Main)
        let selectedStat = showPaginatedGarageMenu([
            "Career Progress",
            "Race Records",
            "Lifetime Stats",
            "Reset Progress"
        ])

        if (selectedStat == 0) {
            showCareerProgress()
        } else if (selectedStat == 1) {
            showRaceRecords()
        } else if (selectedStat == 2) {
            showPlayerStats()
        } else if (selectedStat == 3) {
            confirmResetProgress()
        } else {
            leaveStatsMenu = true
        }
    }
}

/** Runs the Garage until the player chooses a driving mode. */
function showGarage() {
    garageIsOpen = true
    let garagePage = 0

    while (garageIsOpen) {
        setGarageBackground(GarageBackground.Main)
        if (garagePage == 0) {
            story.showPlayerChoices("Parts", "Paint", "More", "Drive")
        } else {
            story.showPlayerChoices(
                "Player Stats", "Settings", "More", "Drive"
            )
        }

        if (story.checkLastAnswer("Parts")) {
            showPartsMenu()
        } else if (story.checkLastAnswer("Paint")) {
            showPaintMenu()
        } else if (story.checkLastAnswer("Player Stats")) {
            showPlayerStatsMenu()
        } else if (story.checkLastAnswer("Settings")) {
            showRacingSettingsMenu()
        } else if (story.checkLastAnswer("More")) {
            garagePage = (garagePage + 1) % 2
        } else if (story.checkLastAnswer("Drive")) {
            chooseDrivingMode()
        }
    }
}
