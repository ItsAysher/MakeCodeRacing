// Main Garage navigation

/** Displays persistent player progression. */
function showPlayerStats() {
    game.showLongText(
        "Cash: $" + cash +
        "\nWins: " + wins +
        "\nTotal Races: " + racesRaced,
        DialogLayout.Bottom
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
        story.showPlayerChoices("Show Stats", "Reset Progress", "Back")

        if (story.checkLastAnswer("Show Stats")) {
            showPlayerStats()
        } else if (story.checkLastAnswer("Reset Progress")) {
            confirmResetProgress()
        } else {
            leaveStatsMenu = true
        }
    }
}

/** Runs the Garage until the player chooses a driving mode. */
function showGarage() {
    garageIsOpen = true

    while (garageIsOpen) {
        setGarageBackground(GarageBackground.Main)
        story.showPlayerChoices(
            "Parts",
            "Paint",
            "Player Stats",
            "Start Race"
        )

        if (story.checkLastAnswer("Parts")) {
            showPartsMenu()
        } else if (story.checkLastAnswer("Paint")) {
            showPaintMenu()
        } else if (story.checkLastAnswer("Player Stats")) {
            showPlayerStatsMenu()
        } else {
            chooseDrivingMode()
        }
    }
}
