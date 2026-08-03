// Garage flow

let garageIsOpen = false

/** Shows a blocking storytelling menu with any number of options. */
function showExtendedGarageMenu(options: string[]) {
    story._currentCutscene().showMenu(options)
    return story.getLastAnswer()
}

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
    game.showLongText(
        "Speed: " + playerTopSpeedRating +
        "\nAcceleration: " + playerAccelerationRating +
        "\nBraking: " + playerBrakingRating +
        "\nDurability: " + playerMaximumDurability +
        "\nEfficiency: " + playerEfficiencyPercent + "%" +
        "\nCash: $" + cash,
        DialogLayout.Bottom
    )
}

/**
 * Runs the part shop until the player returns to the main Garage menu.
 */
function showPartsMenu() {
    let leavePartsMenu = false

    while (!leavePartsMenu && garageIsOpen) {
        setGarageBackground("main")
        let engineName = engineNames[equippedEngineTier]
        let wheelName = wheelNames[equippedWheelTier]
        let bodyName = bodyNames[equippedBodyTier]
        let brakeName = brakeNames[equippedBrakeTier]
        let selectedOption = showExtendedGarageMenu([
            "Engine: " + engineName,
            "Wheels: " + wheelName,
            "Body: " + bodyName,
            "Brakes: " + brakeName,
            "View Car Stats",
            "Back"
        ])

        if (selectedOption == "Engine: " + engineName) {
            chooseEngine()
        } else if (selectedOption == "Wheels: " + wheelName) {
            chooseWheels()
        } else if (selectedOption == "Body: " + bodyName) {
            chooseBody()
        } else if (selectedOption == "Brakes: " + brakeName) {
            chooseBrakes()
        } else if (selectedOption == "View Car Stats") {
            showCarStats()
        } else {
            leavePartsMenu = true
        }
    }
}

function paintShopLabel(index: number) {
    if (paintColorsUnlocked[index]) {
        return paintColorNames[index] + " - Owned"
    }
    return paintColorNames[index] + " - $" + paintPrice
}

/** Purchases one paint color for use on every customizable car part. */
function buyPaintColor(index: number) {
    if (paintColorsUnlocked[index]) {
        story.printCharacterText(paintColorNames[index] + " paint is already owned.")
        return
    }

    if (cash < paintPrice) {
        story.printCharacterText(
            paintColorNames[index] + " paint costs $" + paintPrice +
            ".\nYou need $" + (paintPrice - cash) + " more."
        )
        return
    }

    story.showPlayerChoices("Buy for $" + paintPrice, "Cancel")
    if (story.checkLastAnswer("Buy for $" + paintPrice)) {
        cash -= paintPrice
        paintColorsUnlocked[index] = true
        story.printCharacterText(
            paintColorNames[index] + " paint purchased!\nCash remaining: $" + cash
        )
    }
}

/** Shows every Arcade paint color in a scrolling extended menu. */
function showBuyPaintMenu() {
    let leavePaintShop = false
    let firstPaintOnPage = 0

    while (!leavePaintShop && garageIsOpen) {
        let options: string[] = []
        let lastPaintOnPage = Math.min(firstPaintOnPage + 4, paintColorNames.length)

        for (let index = firstPaintOnPage; index < lastPaintOnPage; index++) {
            options.push(paintShopLabel(index))
        }

        if (lastPaintOnPage < paintColorNames.length) {
            options.push("More")
        } else {
            options.push("Back")
        }

        let selectedOption = showExtendedGarageMenu(options)
        if (selectedOption == "More") {
            firstPaintOnPage = lastPaintOnPage
        } else if (selectedOption == "Back") {
            leavePaintShop = true
        } else {
            for (let index = firstPaintOnPage; index < lastPaintOnPage; index++) {
                if (selectedOption == paintShopLabel(index)) {
                    buyPaintColor(index)
                    break
                }
            }
        }
    }
}

function paintPartName(part: CarPaintPart) {
    if (part == CarPaintPart.Primary) {
        return "Primary"
    } else if (part == CarPaintPart.Secondary) {
        return "Secondary"
    }
    return "Accent"
}

/** Shows owned paints and confirms a new color for one car part. */
function customizePaintPart(part: CarPaintPart) {
    let colorOptions: string[] = []
    let optionIndexes: number[] = []
    let currentColor = equippedColorForPart(part)

    for (let index = 0; index < paintColorNames.length; index++) {
        if (paintColorsUnlocked[index]) {
            let label = paintColorNames[index]
            if (paintColorValues[index] == currentColor) {
                label += " - Equipped"
            }
            colorOptions.push(label)
            optionIndexes.push(index)
        }
    }

    let firstPaintOnPage = 0
    while (garageIsOpen) {
        let options: string[] = []
        let lastPaintOnPage = Math.min(firstPaintOnPage + 4, colorOptions.length)

        for (let index = firstPaintOnPage; index < lastPaintOnPage; index++) {
            options.push(colorOptions[index])
        }

        if (lastPaintOnPage < colorOptions.length) {
            options.push("More")
        } else {
            options.push("Back")
        }

        let selectedOption = showExtendedGarageMenu(options)
        if (selectedOption == "More") {
            firstPaintOnPage = lastPaintOnPage
        } else if (selectedOption == "Back") {
            return
        } else {
            for (let optionIndex = firstPaintOnPage; optionIndex < lastPaintOnPage; optionIndex++) {
                if (selectedOption == colorOptions[optionIndex]) {
                    let colorIndex = optionIndexes[optionIndex]
                    let colorName = paintColorNames[colorIndex]
                    story.showPlayerChoices("Use " + colorName, "Cancel")

                    if (story.checkLastAnswer("Use " + colorName)) {
                        equipPlayerPaint(part, paintColorValues[colorIndex])
                    }
                    return
                }
            }
        }
    }
}

/** Shows the current car above the primary, secondary, and accent menu. */
function showCustomizeCarMenu() {
    setGarageBackground("main")
    let preview = sprites.create(
        playerCarPreviewImage(equippedBodyTier, CarImageDirection.Right),
        SpriteKind.PlayerVisual
    )
    preview.setFlag(SpriteFlag.Ghost, true)
    preview.setFlag(SpriteFlag.RelativeToCamera, true)
    preview.setPosition(98, 47)
    preview.z = 90

    let leaveCustomizeMenu = false
    while (!leaveCustomizeMenu && garageIsOpen) {
        let primaryChoice = "Primary: " + paintColorName(equippedPrimaryColor)
        let secondaryChoice = "Secondary: " + paintColorName(equippedSecondaryColor)
        let accentChoice = "Accent: " + paintColorName(equippedAccentColor)
        story.showPlayerChoices(primaryChoice, secondaryChoice, accentChoice, "Back")

        if (story.checkLastAnswer(primaryChoice)) {
            customizePaintPart(CarPaintPart.Primary)
        } else if (story.checkLastAnswer(secondaryChoice)) {
            customizePaintPart(CarPaintPart.Secondary)
        } else if (story.checkLastAnswer(accentChoice)) {
            customizePaintPart(CarPaintPart.Accent)
        } else {
            leaveCustomizeMenu = true
        }

        preview.setImage(playerCarPreviewImage(equippedBodyTier, CarImageDirection.Right))
    }

    preview.destroy()
}

/** Runs the paint purchase and car customization shop. */
function showPaintMenu() {
    let leavePaintMenu = false

    while (!leavePaintMenu && garageIsOpen) {
        setGarageBackground("main")
        story.showPlayerChoices("Buy Paint", "Customize Car", "Back")

        if (story.checkLastAnswer("Buy Paint")) {
            showBuyPaintMenu()
        } else if (story.checkLastAnswer("Customize Car")) {
            showCustomizeCarMenu()
        } else {
            leavePaintMenu = true
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
        story.showPlayerChoices("Parts", "Paint", "Start Race")

        if (story.checkLastAnswer("Parts")) {
            showPartsMenu()
        } else if (story.checkLastAnswer("Paint")) {
            showPaintMenu()
        } else {
            chooseDrivingMode()
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
