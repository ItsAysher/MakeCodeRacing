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

function partMenuLabel(partList: string[], unlockedParts: boolean[], index: number) {
    if (unlockedParts[index]) {
        return partList[index]
    }

    return partList[index] + " ($" + partPrices[index] + ")"
}

function choosePartIndex(partList: string[], unlockedParts: boolean[]) {
    let tier1Choice = partMenuLabel(partList, unlockedParts, 0)
    let tier2Choice = partMenuLabel(partList, unlockedParts, 1)
    let tier3Choice = partMenuLabel(partList, unlockedParts, 2)

    story.showPlayerChoices(tier1Choice, tier2Choice, tier3Choice, "Back")

    if (story.checkLastAnswer(tier1Choice)) {
        return 0
    } else if (story.checkLastAnswer(tier2Choice)) {
        return 1
    } else if (story.checkLastAnswer(tier3Choice)) {
        return 2
    }

    return -1
}

function unlockPart(partName: string, partIndex: number, unlockedParts: boolean[]) {
    if (unlockedParts[partIndex]) {
        return true
    }

    let price = partPrices[partIndex]

    if (cash < price) {
        story.printCharacterText(
            partName + " costs $" + price +
            ".\nYou need $" + (price - cash) +
            " more. Win more races!"
        )
        return false
    }

    story.showPlayerChoices("Buy for $" + price, "Cancel")

    if (story.checkLastAnswer("Buy for $" + price)) {
        cash -= price
        unlockedParts[partIndex] = true
        story.printCharacterText(partName + " purchased!\nCash remaining: $" + cash)
        return true
    }

    return false
}

function chooseEngine() {
    setGarageBackground("engine")
    let selectedPart = choosePartIndex(engines, engineUnlocked)

    if (selectedPart >= 0 && unlockPart(engines[selectedPart], selectedPart, engineUnlocked)) {
        engine = engines[selectedPart]
        updatePlayerStats()
    }
}

function chooseWheels() {
    setGarageBackground("wheels")
    let selectedPart = choosePartIndex(wheelTypes, wheelsUnlocked)

    if (selectedPart >= 0 && unlockPart(wheelTypes[selectedPart], selectedPart, wheelsUnlocked)) {
        wheels = wheelTypes[selectedPart]
        updatePlayerStats()
    }
}

function chooseBody() {
    setGarageBackground("body")
    let selectedPart = choosePartIndex(carBodies, bodyUnlocked)

    if (selectedPart >= 0 && unlockPart(carBodies[selectedPart], selectedPart, bodyUnlocked)) {
        body = carBodies[selectedPart]
        updatePlayerStats()
    }
}

function chooseBrakes() {
    setGarageBackground("brakes")
    let selectedPart = choosePartIndex(brakeTypes, brakesUnlocked)

    if (selectedPart >= 0 && unlockPart(brakeTypes[selectedPart], selectedPart, brakesUnlocked)) {
        brakes = brakeTypes[selectedPart]
        updatePlayerStats()
    }
}

function showCarStats() {
    story.printCharacterText(
        "Speed: " + speed +
        "\nAcceleration: " + acceleration +
        "\nBraking: " + brakeSpeed +
        "\nDurability: " + durability +
        "\nEfficiency: " + efficiency + "%" +
        "\nCash: $" + cash,
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
                chooseFreeRoamTheme()
            } else {
                game.showLongText("Free Roam unlocks after 10 race wins.\nCurrent wins: " + wins, DialogLayout.Full)
            }
        } else {
            leaveDrivingModeMenu = true
        }
    }
}

function chooseFreeRoamTheme() {
    setGarageBackground("main")
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

// Records the result and opens the Garage before the next race can begin.
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
