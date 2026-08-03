// Garage race difficulty and Free Roam selection

/** Selects a race difficulty and enforces its win-count requirement. */
function chooseRaceDifficulty() {
    let intermediateChoice = wins >= 5 ? "Intermediate" : "Intermediate (5 wins)"
    let expertChoice = wins >= 10 ? "Expert" : "Expert (10 wins)"

    setGarageBackground(GarageBackground.Main)
    story.showPlayerChoices(
        "Beginner",
        intermediateChoice,
        expertChoice,
        "Back"
    )

    if (story.checkLastAnswer("Beginner")) {
        selectedRace = RaceDifficulty.Beginner
        selectedDrivingMode = DrivingMode.Race
        garageIsOpen = false
    } else if (story.checkLastAnswer(intermediateChoice)) {
        if (wins >= 5) {
            selectedRace = RaceDifficulty.Intermediate
            selectedDrivingMode = DrivingMode.Race
            garageIsOpen = false
        } else {
            story.printCharacterText(
                "Intermediate unlocks after 5 wins.\nCurrent wins: " + wins
            )
        }
    } else if (story.checkLastAnswer(expertChoice)) {
        if (wins >= 10) {
            selectedRace = RaceDifficulty.Expert
            selectedDrivingMode = DrivingMode.Race
            garageIsOpen = false
        } else {
            story.printCharacterText(
                "Expert unlocks after 10 wins.\nCurrent wins: " + wins
            )
        }
    }
}

/** Runs the driving-mode menu and enforces the Free Roam win requirement. */
function chooseDrivingMode() {
    let leaveDrivingModeMenu = false

    while (!leaveDrivingModeMenu && garageIsOpen) {
        let freeRoamChoice = wins >= 10 ? "Free Roam" : "Free Roam (10 wins)"

        setGarageBackground(GarageBackground.Main)
        story.showPlayerChoices("Races", freeRoamChoice, "Back")

        if (story.checkLastAnswer("Races")) {
            chooseRaceDifficulty()
        } else if (story.checkLastAnswer(freeRoamChoice)) {
            if (wins >= 10) {
                chooseFreeRoamTheme()
            } else {
                game.showLongText(
                    "Free Roam unlocks after 10 race wins.\nCurrent wins: " + wins,
                    DialogLayout.Full
                )
            }
        } else {
            leaveDrivingModeMenu = true
        }
    }
}

/** Selects a Free Roam theme and closes the Garage. */
function chooseFreeRoamTheme() {
    setGarageBackground(GarageBackground.Main)
    story.showPlayerChoices("Forest", "Highway", "Cave", "Back")

    if (story.checkLastAnswer("Forest")) {
        selectedFreeRoamTheme = FreeRoamTheme.Forest
    } else if (story.checkLastAnswer("Highway")) {
        selectedFreeRoamTheme = FreeRoamTheme.Highway
    } else if (story.checkLastAnswer("Cave")) {
        selectedFreeRoamTheme = FreeRoamTheme.Cave
    } else {
        return
    }

    selectedDrivingMode = DrivingMode.FreeRoam
    garageIsOpen = false
}
