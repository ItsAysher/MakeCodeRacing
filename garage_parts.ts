// Garage part purchasing, equipping, and car-stat display

function partMenuLabel(partList: string[], unlockedParts: boolean[], index: number) {
    if (unlockedParts[index]) {
        return partList[index]
    }
    return partList[index] + " ($" + partPrices[index] + ")"
}

/** Shows all tiers for one category and returns the tier index, or -1 for Back. */
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

/** Purchases a locked part and reports whether it is available to equip. */
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
        story.printCharacterText(
            partName + " purchased!\nCash remaining: $" + cash
        )
        return true
    }
    return false
}

/** Runs the common background, selection, and purchase flow for one part type. */
function choosePurchasablePart(
    background: GarageBackground,
    partNames: string[],
    unlockedParts: boolean[]
) {
    setGarageBackground(background)
    let selectedPart = choosePartIndex(partNames, unlockedParts)

    if (selectedPart >= 0) {
        showPartComparison(background, selectedPart)
    }
    if (selectedPart >= 0 &&
        unlockPart(partNames[selectedPart], selectedPart, unlockedParts)) {
        return selectedPart
    }
    return -1
}

function garageRatingDelta(value: number) {
    if (value > 0) {
        return " (+" + value + ")"
    } else if (value < 0) {
        return " (" + value + ")"
    }
    return ""
}

/** Shows the complete candidate loadout before buying or equipping a part. */
function showPartComparison(background: GarageBackground, tier: number) {
    let candidateEngine = equippedEngineTier
    let candidateWheels = equippedWheelTier
    let candidateBody = equippedBodyTier
    let candidateBrakes = equippedBrakeTier
    if (background == GarageBackground.Engine) {
        candidateEngine = tier
    } else if (background == GarageBackground.Wheels) {
        candidateWheels = tier
    } else if (background == GarageBackground.Body) {
        candidateBody = tier
    } else if (background == GarageBackground.Brakes) {
        candidateBrakes = tier
    }

    let current = calculateVehicleRatings(
        equippedEngineTier,
        equippedWheelTier,
        equippedBodyTier,
        equippedBrakeTier
    )
    let candidate = calculateVehicleRatings(
        candidateEngine,
        candidateWheels,
        candidateBody,
        candidateBrakes
    )
    game.showLongText(
        "LOADOUT PREVIEW" +
        "\nSpeed: " + candidate.topSpeed +
            garageRatingDelta(candidate.topSpeed - current.topSpeed) +
        "\nAcceleration: " + candidate.acceleration +
            garageRatingDelta(candidate.acceleration - current.acceleration) +
        "\nBraking: " + candidate.braking +
            garageRatingDelta(candidate.braking - current.braking) +
        "\nDurability: " + candidate.durability +
            garageRatingDelta(candidate.durability - current.durability) +
        "\nEfficiency: " + candidate.efficiency + "%" +
            garageRatingDelta(candidate.efficiency - current.efficiency),
        DialogLayout.Bottom
    )
}

function chooseEngine() {
    let tier = choosePurchasablePart(
        GarageBackground.Engine,
        engineNames,
        engineUnlocked
    )
    if (tier >= 0 && equippedEngineTier != tier) {
        equippedEngineTier = tier
        recalculatePlayerStats()
        saveGameProgress()
    }
}

function chooseWheels() {
    let tier = choosePurchasablePart(
        GarageBackground.Wheels,
        wheelNames,
        wheelsUnlocked
    )
    if (tier >= 0 && equippedWheelTier != tier) {
        equippedWheelTier = tier
        recalculatePlayerStats()
        saveGameProgress()
    }
}

function chooseBody() {
    let tier = choosePurchasablePart(
        GarageBackground.Body,
        bodyNames,
        bodyUnlocked
    )
    if (tier >= 0 && equippedBodyTier != tier) {
        equippedBodyTier = tier
        recalculatePlayerStats()
        saveGameProgress()
    }
}

function chooseBrakes() {
    let tier = choosePurchasablePart(
        GarageBackground.Brakes,
        brakeNames,
        brakesUnlocked
    )
    if (tier >= 0 && equippedBrakeTier != tier) {
        equippedBrakeTier = tier
        recalculatePlayerStats()
        saveGameProgress()
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

/** Runs the part shop until the player returns to the main Garage menu. */
function showPartsMenu() {
    let leavePartsMenu = false

    while (!leavePartsMenu && garageIsOpen) {
        setGarageBackground(GarageBackground.Main)
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
