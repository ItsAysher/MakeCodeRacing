// Main Garage navigation

/** Displays session progression*/
function showPlayerStats() {
    game.showLongText(
        "Cash: $" + cash +
        "\nWins: " + wins +
        "\nTotal Races: " + racesRaced,
        DialogLayout.Bottom
    )
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
            showPlayerStats()
        } else {
            chooseDrivingMode()
        }
    }
}
