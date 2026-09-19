// Garage paint purchasing, pagination, customization, and preview

function paintShopLabel(index: number) {
    if (paintColorsUnlocked[index]) {
        return paintColorNames[index] + " - Owned"
    }
    return paintColorNames[index] + " - $" + paintPrice
}

/** Purchases one paint color for use on every customizable car part. */
function buyPaintColor(index: number) {
    if (paintColorsUnlocked[index]) {
        story.printCharacterText(
            paintColorNames[index] + " paint is already owned."
        )
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
        saveGameProgress()
        story.printCharacterText(
            paintColorNames[index] +
            " paint purchased!\nCash remaining: $" + cash
        )
    }
}

/** Shows every Arcade paint color in a paginated menu. */
function showBuyPaintMenu() {
    while (garageIsOpen) {
        let paintOptions: string[] = []
        for (let index = 0; index < paintColorNames.length; index++) {
            paintOptions.push(paintShopLabel(index))
        }

        let selectedPaint = showPaginatedGarageMenu(paintOptions)
        if (selectedPaint < 0) {
            return
        }
        buyPaintColor(selectedPaint)
    }
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

    let selectedOption = showPaginatedGarageMenu(colorOptions)
    if (selectedOption < 0) {
        return
    }

    let colorIndex = optionIndexes[selectedOption]
    let colorName = paintColorNames[colorIndex]
    story.showPlayerChoices("Use " + colorName, "Cancel")

    if (story.checkLastAnswer("Use " + colorName)) {
        equipPlayerPaint(part, paintColorValues[colorIndex])
    }
}

/** Shows the current car above its primary, secondary, and accent options. */
function showCustomizeCarMenu() {
    setGarageBackground(GarageBackground.Main)
    let preview = sprites.create(
        playerCarPreviewImage(equippedBodyTier, CarImageDirection.Right),
        SpriteKind.PlayerVisual
    )
    preview.setFlag(SpriteFlag.Ghost, true)
    preview.setFlag(SpriteFlag.RelativeToCamera, true)
    preview.setPosition(98, 47)
    preview.z = 90

    let previewPaintRevision = playerPaintRevision
    let leaveCustomizeMenu = false
    while (!leaveCustomizeMenu && garageIsOpen) {
        let primaryChoice =
            "Primary: " + paintColorName(equippedPrimaryColor)
        let secondaryChoice =
            "Secondary: " + paintColorName(equippedSecondaryColor)
        let accentChoice =
            "Accent: " + paintColorName(equippedAccentColor)
        story.showPlayerChoices(
            primaryChoice,
            secondaryChoice,
            accentChoice,
            "Back"
        )

        if (story.checkLastAnswer(primaryChoice)) {
            customizePaintPart(CarPaintPart.Primary)
        } else if (story.checkLastAnswer(secondaryChoice)) {
            customizePaintPart(CarPaintPart.Secondary)
        } else if (story.checkLastAnswer(accentChoice)) {
            customizePaintPart(CarPaintPart.Accent)
        } else {
            leaveCustomizeMenu = true
        }

        if (previewPaintRevision != playerPaintRevision) {
            preview.setImage(
                playerCarPreviewImage(
                    equippedBodyTier,
                    CarImageDirection.Right
                )
            )
            previewPaintRevision = playerPaintRevision
        }
    }

    preview.destroy()
}

/** Runs the paint purchase and car customization shop. */
function showPaintMenu() {
    let leavePaintMenu = false

    while (!leavePaintMenu && garageIsOpen) {
        setGarageBackground(GarageBackground.Main)
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
