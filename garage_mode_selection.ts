// Garage race difficulty and Free Roam selection

function confirmRaceDifficulty(difficulty: RaceDifficulty) {
    selectedRace = difficulty
    let definition = raceDefinitionForDifficulty(difficulty)
    let choosingRaceAction = true

    while (choosingRaceAction && garageIsOpen) {
        let recordIndex = raceRecordIndex(difficulty, selectedRaceLayout)
        let record = bestRaceTimeMilliseconds[recordIndex]
        let layoutChoice = "Layout: " + raceLayoutLabel(selectedRaceLayout)
        scene.setBackgroundImage(createRaceFieldCard(difficulty))
        story.showPlayerChoices(
            "Start Race",
            layoutChoice,
            "Event Info",
            "Back"
        )

        if (story.checkLastAnswer("Start Race")) {
            cancelChampionshipSeries()
            selectedDrivingMode = DrivingMode.Race
            garageIsOpen = false
            choosingRaceAction = false
        } else if (story.checkLastAnswer(layoutChoice)) {
            selectedRaceLayout = selectedRaceLayout == RaceLayout.Forward ?
                RaceLayout.Reverse : RaceLayout.Forward
        } else if (story.checkLastAnswer("Event Info")) {
            game.showLongText(
                definition.name + " CIRCUIT" +
                "\nLayout: " + raceLayoutLabel(selectedRaceLayout) +
                "\n" + definition.lapTarget + " lap" +
                    (definition.lapTarget == 1 ? "" : "s") +
                    " | " + definition.aiCount + " rivals" +
                "\nPrize: $" + definition.prize +
                    " | Limit: " + formatRaceTime(
                        definition.timeLimit * 1000
                    ) +
                "\nBest: " + raceRecordValue(record) +
                    " [" + raceMedalShortForTime(difficulty, record) + "]" +
                "\n\nGold: " + formatRaceTime(
                    raceGoldTargetMilliseconds[difficulty]
                ) +
                "\nSilver: " + formatRaceTime(
                    raceSilverTargetMilliseconds[difficulty]
                ),
                DialogLayout.Full
            )
        } else {
            choosingRaceAction = false
        }
    }

    if (garageIsOpen) {
        setGarageBackground(GarageBackground.Main)
    }
}

/** Selects a race difficulty and enforces its win-count requirement. */
function chooseRaceDifficulty() {
    let beginnerRecordIndex = raceRecordIndex(
        RaceDifficulty.Beginner,
        selectedRaceLayout
    )
    let intermediateRecordIndex = raceRecordIndex(
        RaceDifficulty.Intermediate,
        selectedRaceLayout
    )
    let expertRecordIndex = raceRecordIndex(
        RaceDifficulty.Expert,
        selectedRaceLayout
    )
    let beginnerChoice = "Beginner [" + raceMedalShortForTime(
        RaceDifficulty.Beginner,
        bestRaceTimeMilliseconds[beginnerRecordIndex]
    ) + "]"
    let intermediateChoice = wins >= 3 ?
        "Intermediate [" + raceMedalShortForTime(
            RaceDifficulty.Intermediate,
            bestRaceTimeMilliseconds[intermediateRecordIndex]
        ) + "]" : "Intermediate (3 wins)"
    let expertChoice = wins >= 7 ?
        "Expert [" + raceMedalShortForTime(
            RaceDifficulty.Expert,
            bestRaceTimeMilliseconds[expertRecordIndex]
        ) + "]" : "Expert (7 wins)"

    setGarageBackground(GarageBackground.Main)
    story.showPlayerChoices(
        beginnerChoice,
        intermediateChoice,
        expertChoice,
        "Back"
    )

    if (story.checkLastAnswer(beginnerChoice)) {
        confirmRaceDifficulty(RaceDifficulty.Beginner)
    } else if (story.checkLastAnswer(intermediateChoice)) {
        if (wins >= 3) {
            confirmRaceDifficulty(RaceDifficulty.Intermediate)
        } else {
            story.printCharacterText(
                "Intermediate unlocks after 3 wins.\nCurrent wins: " + wins
            )
        }
    } else if (story.checkLastAnswer(expertChoice)) {
        if (wins >= 7) {
            confirmRaceDifficulty(RaceDifficulty.Expert)
        } else {
            story.printCharacterText(
                "Expert unlocks after 7 wins.\nCurrent wins: " + wins
            )
        }
    }
}

/** Runs the driving-mode menu and enforces the Free Roam win requirement. */
function chooseDrivingMode() {
    let leaveDrivingModeMenu = false

    while (!leaveDrivingModeMenu && garageIsOpen) {
        let freeRoamChoice = wins >= 3 ? "Free Roam" : "Free Roam (3 wins)"
        let championshipChoice = championshipActive ?
            "Resume Championship" :
            (wins >= 7 ? "Championship" : "Championship (7 wins)")

        setGarageBackground(GarageBackground.Main)
        story.showPlayerChoices(
            "Races", freeRoamChoice, championshipChoice, "Back"
        )

        if (story.checkLastAnswer("Races")) {
            chooseRaceDifficulty()
        } else if (story.checkLastAnswer(freeRoamChoice)) {
            if (wins >= 3) {
                chooseFreeRoamTheme()
            } else {
                game.showLongText(
                    "Free Roam unlocks after 3 race wins.\nCurrent wins: " + wins,
                    DialogLayout.Full
                )
            }
        } else if (story.checkLastAnswer(championshipChoice)) {
            if (championshipActive) {
                selectedRaceLayout = RaceLayout.Forward
                selectedRace = championshipRound as RaceDifficulty
                selectedDrivingMode = DrivingMode.Race
                garageIsOpen = false
            } else if (wins >= 7) {
                showChampionshipBriefing()
            } else {
                game.showLongText(
                    "Championship unlocks after 7 race wins.\nCurrent wins: " +
                        wins,
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

    cancelChampionshipSeries()
    selectedDrivingMode = DrivingMode.FreeRoam
    garageIsOpen = false
}
