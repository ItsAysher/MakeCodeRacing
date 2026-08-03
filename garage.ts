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

/**
 * Returns the label for a part in the Garage menu.
 * @param partList The part names for the current category.
 * @param unlockedParts Ownership state for the current category.
 * @param index The tier index to display.
 * @returns The part name, including its price when locked.
 */
function partMenuLabel(partList: string[], unlockedParts: boolean[], index: number) {
    if (unlockedParts[index]) {
        return partList[index]
    }

    return partList[index] + " ($" + partPrices[index] + ")"
}

/**
 * Shows all tiers for one category and returns the selected tier index.
 * @param partList The part names for the current category.
 * @param unlockedParts Ownership state for the current category.
 * @returns The selected tier index, or -1 when the player chooses Back.
 */
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

/**
 * Purchases a locked part after checking cash and confirming the transaction.
 * Already-owned parts succeed immediately so they can be equipped again.
 * @param partName The part name shown in purchase messages.
 * @param partIndex The tier index in the catalog.
 * @param unlockedParts Ownership state for the current category.
 * @returns True when the selected part is available to equip.
 */
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
    let selectedPart = choosePartIndex(engineNames, engineUnlocked)

    if (selectedPart >= 0 && unlockPart(engineNames[selectedPart], selectedPart, engineUnlocked)) {
        equippedEngineTier = selectedPart
        recalculatePlayerStats()
    }
}

function chooseWheels() {
    setGarageBackground("wheels")
    let selectedPart = choosePartIndex(wheelNames, wheelsUnlocked)

    if (selectedPart >= 0 && unlockPart(wheelNames[selectedPart], selectedPart, wheelsUnlocked)) {
        equippedWheelTier = selectedPart
        recalculatePlayerStats()
    }
}

function chooseBody() {
    setGarageBackground("body")
    let selectedPart = choosePartIndex(bodyNames, bodyUnlocked)

    if (selectedPart >= 0 && unlockPart(bodyNames[selectedPart], selectedPart, bodyUnlocked)) {
        equippedBodyTier = selectedPart
        recalculatePlayerStats()
    }
}

function chooseBrakes() {
    setGarageBackground("brakes")
    let selectedPart = choosePartIndex(brakeNames, brakesUnlocked)

    if (selectedPart >= 0 && unlockPart(brakeNames[selectedPart], selectedPart, brakesUnlocked)) {
        equippedBrakeTier = selectedPart
        recalculatePlayerStats()
    }
}

function showCarStats() {
    story.printCharacterText(
        "Speed: " + playerTopSpeedRating +
        "\nAcceleration: " + playerAccelerationRating +
        "\nBraking: " + playerBrakingRating +
        "\nDurability: " + playerMaximumDurability +
        "\nEfficiency: " + playerEfficiencyPercent + "%" +
        "\nCash: $" + cash,
    )
}

/**
 * Runs the secondary Garage menu for brakes, stats, and driving-mode selection.
 */
function showMoreGarageOptions() {
    let leaveMoreMenu = false

    while (!leaveMoreMenu && garageIsOpen) {
        setGarageBackground("main")
        let brakeName = brakeNames[equippedBrakeTier]
        story.showPlayerChoices("Brakes: " + brakeName, "View Car Stats", "Start Race", "Back")

        if (story.checkLastAnswer("Brakes: " + brakeName)) {
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

/**
 * Selects a race difficulty and enforces its win-count requirement.
 * A valid selection closes the Garage and prepares Race mode.
 */
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

/**
 * Runs the driving-mode menu and enforces the Free Roam unlock requirement.
 */
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

/**
 * Selects a Free Roam theme, prepares Free Roam mode, and closes the Garage.
 */
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

/**
 * Runs the main Garage loop until the player chooses a driving mode.
 * The function blocks its current storytelling cutscene while menus are open.
 */
function showGarage() {
    garageIsOpen = true

    while (garageIsOpen) {
        setGarageBackground("main")
        let engineName = engineNames[equippedEngineTier]
        let wheelName = wheelNames[equippedWheelTier]
        let bodyName = bodyNames[equippedBodyTier]
        story.showPlayerChoices(
            "Engine: " + engineName,
            "Wheels: " + wheelName,
            "Body: " + bodyName,
            "More"
        )

        if (story.checkLastAnswer("Engine: " + engineName)) {
            chooseEngine()
        } else if (story.checkLastAnswer("Wheels: " + wheelName)) {
            chooseWheels()
        } else if (story.checkLastAnswer("Body: " + bodyName)) {
            chooseBody()
        } else {
            showMoreGarageOptions()
        }
    }
}

/**
 * Records a race result, awards its prize, and opens the Garage.
 * @param won Whether the player won the race.
 * @param prizeMoney Cash awarded for this result.
 */
function finishRace(won: boolean, prizeMoney: number) {
    racesRaced += 1
    cash += prizeMoney

    if (won) {
        wins += 1
    }

    openGarage(startSelectedDrivingMode)
}

/**
 * Opens the Garage inside a storytelling cutscene and restores the old background.
 * @param afterGarage Optional callback run after a driving mode closes the Garage.
 */
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
