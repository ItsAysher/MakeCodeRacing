// Garage flow

let garageIsOpen = false

function setGarageBackground(category: string) {
    if (category == "engine") {
        scene.setBackgroundImage(assets.image`garage-engine-background`)
    } else if (category == "wheels") {
        scene.setBackgroundImage(assets.image`garage-wheels-background`)
    } else if (category == "body") {
        scene.setBackgroundImage(assets.image`garage-body-background`)
    } else if (category == "brakes") {
        scene.setBackgroundImage(assets.image`garage-brakes-background`)
    } else {
        scene.setBackgroundImage(assets.image`garage-main-background`)
    }
}

function chooseEngine() {
    setGarageBackground("engine")
    story.showPlayerChoices(engines[0], engines[1], engines[2], "Back")

    if (!story.checkLastAnswer("Back")) {
        engine = story.getLastAnswer()
        updatePlayerStats()
    }
}

function chooseWheels() {
    setGarageBackground("wheels")
    story.showPlayerChoices(wheelTypes[0], wheelTypes[1], wheelTypes[2], "Back")

    if (!story.checkLastAnswer("Back")) {
        wheels = story.getLastAnswer()
        updatePlayerStats()
    }
}

function chooseBody() {
    setGarageBackground("body")
    story.showPlayerChoices(carBodies[0], carBodies[1], carBodies[2], "Back")

    if (!story.checkLastAnswer("Back")) {
        body = story.getLastAnswer()
        updatePlayerStats()
    }
}

function chooseBrakes() {
    setGarageBackground("brakes")
    story.showPlayerChoices(brakeTypes[0], brakeTypes[1], brakeTypes[2], "Back")

    if (!story.checkLastAnswer("Back")) {
        brakes = story.getLastAnswer()
        updatePlayerStats()
    }
}

function showCarStats() {
    story.printCharacterText(
        "Speed: " + speed +
        "\nAcceleration: " + acceleration +
        "\nBraking: " + brakeSpeed +
        "\nDurability: " + durability +
        "\nEfficiency: " + efficiency + "%"
    )
}

function showMoreGarageOptions() {
    let leaveMoreMenu = false

    while (!leaveMoreMenu && garageIsOpen) {
        setGarageBackground("main")
        story.showPlayerChoices("Brakes: " + brakes, "View Car Stats", "Start Race", "Back")

        if (story.checkLastAnswer("Brakes: " + brakes)) {
            chooseBrakes()
        } else if (story.checkLastAnswer("View Car Stats")) {
            showCarStats()
        } else if (story.checkLastAnswer("Start Race")) {
            chooseDrivingMode()
        } else {
            leaveMoreMenu = true
        }
    }
}

function chooseRaceDifficulty() {
    let intermediateChoice = wins >= 5 ? "Intermediate" : "Intermediate (5 wins)"
    let expertChoice = wins >= 10 ? "Expert" : "Expert (10 wins)"

    setGarageBackground("main")
    story.showPlayerChoices("Beginner", intermediateChoice, expertChoice, "Back")

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
            story.printCharacterText("Intermediate unlocks after 5 wins.\nCurrent wins: " + wins)
        }
    } else if (story.checkLastAnswer(expertChoice)) {
        if (wins >= 10) {
            selectedRace = RaceDifficulty.Expert
            selectedDrivingMode = DrivingMode.Race
            garageIsOpen = false
        } else {
            story.printCharacterText("Expert unlocks after 10 wins.\nCurrent wins: " + wins)
        }
    }
}

function chooseDrivingMode() {
    let leaveDrivingModeMenu = false

    while (!leaveDrivingModeMenu && garageIsOpen) {
        let freeRoamChoice = wins >= 10 ? "Free Roam" : "Free Roam (10 wins)"

        setGarageBackground("main")
        story.showPlayerChoices("Races", freeRoamChoice, "Back")

        if (story.checkLastAnswer("Races")) {
            chooseRaceDifficulty()
        } else if (story.checkLastAnswer(freeRoamChoice)) {
            if (wins >= 10) {
                selectedDrivingMode = DrivingMode.FreeRoam
                garageIsOpen = false
            } else {
                story.printCharacterText("Free Roam unlocks after 10 race wins.\nCurrent wins: " + wins)
            }
        } else {
            leaveDrivingModeMenu = true
        }
    }
}

// This function blocks its current cutscene until the player chooses Start Race.
function showGarage() {
    leaveRaceForGarage()
    garageIsOpen = true

    while (garageIsOpen) {
        setGarageBackground("main")
        story.showPlayerChoices(
            "Engine: " + engine,
            "Wheels: " + wheels,
            "Body: " + body,
            "More"
        )

        if (story.checkLastAnswer("Engine: " + engine)) {
            chooseEngine()
        } else if (story.checkLastAnswer("Wheels: " + wheels)) {
            chooseWheels()
        } else if (story.checkLastAnswer("Body: " + body)) {
            chooseBody()
        } else {
            showMoreGarageOptions()
        }
    }
}

// Use this hook whenever a race ends. It records the result and opens the
// Garage before the next race can begin.
function finishRace(won: boolean, prizeMoney: number) {
    racesRaced += 1
    cash += prizeMoney

    if (won) {
        wins += 1
    }

    openGarage(startSelectedDrivingMode)
}

// Opens the Garage safely from normal gameplay by putting it in a storytelling
// cutscene. The callback runs only after Start Race is selected.
function openGarage(afterGarage?: () => void) {
    if (garageIsOpen) {
        return
    }

    let previousBackground = scene.backgroundImage()

    story.startCutscene(function () {
        showGarage()
        scene.setBackgroundImage(previousBackground)

        if (afterGarage) {
            afterGarage()
        }
    })
}
