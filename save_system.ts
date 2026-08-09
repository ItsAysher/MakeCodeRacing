// Persistent player progression stored as one versioned settings record

const racingSaveKey = "makecode-racing-save"
const racingSaveVersion = 1
const racingSaveValueCount = 38

function saveBoolean(value: boolean) {
    return value ? 1 : 0
}

function loadBoolean(value: number) {
    return value != 0
}

function loadWholeNumber(value: number, minimum: number, maximum: number) {
    if (value != value) {
        return minimum
    }
    return Math.max(minimum, Math.min(maximum, Math.floor(value)))
}

function loadOwnedPaintColor(colorValue: number, fallbackColor: number) {
    for (let index = 0; index < paintColorValues.length; index++) {
        if (paintColorValues[index] == colorValue && paintColorsUnlocked[index]) {
            return colorValue
        }
    }
    return fallbackColor
}

/** Writes all permanent player progression as one coherent save record. */
function saveGameProgress() {
    let saveData: number[] = []

    saveData.push(racingSaveVersion)
    saveData.push(cash)
    saveData.push(wins)
    saveData.push(racesRaced)
    saveData.push(equippedEngineTier)
    saveData.push(equippedWheelTier)
    saveData.push(equippedBodyTier)
    saveData.push(equippedBrakeTier)

    for (let index = 0; index < engineUnlocked.length; index++) {
        saveData.push(saveBoolean(engineUnlocked[index]))
    }
    for (let index = 0; index < wheelsUnlocked.length; index++) {
        saveData.push(saveBoolean(wheelsUnlocked[index]))
    }
    for (let index = 0; index < bodyUnlocked.length; index++) {
        saveData.push(saveBoolean(bodyUnlocked[index]))
    }
    for (let index = 0; index < brakesUnlocked.length; index++) {
        saveData.push(saveBoolean(brakesUnlocked[index]))
    }
    for (let index = 0; index < paintColorsUnlocked.length; index++) {
        saveData.push(saveBoolean(paintColorsUnlocked[index]))
    }

    saveData.push(equippedPrimaryColor)
    saveData.push(equippedSecondaryColor)
    saveData.push(equippedAccentColor)
    settings.writeNumberArray(racingSaveKey, saveData)
}

/** Restores saved progression, returning false when no compatible save exists. */
function loadGameProgress() {
    let saveData = settings.readNumberArray(racingSaveKey)
    if (!saveData ||
        saveData.length < racingSaveValueCount ||
        saveData[0] != racingSaveVersion) {
        return false
    }

    cash = loadWholeNumber(saveData[1], 0, 999999999)
    racesRaced = loadWholeNumber(saveData[3], 0, 999999999)
    wins = loadWholeNumber(saveData[2], 0, racesRaced)

    equippedEngineTier = loadWholeNumber(saveData[4], 0, 2)
    equippedWheelTier = loadWholeNumber(saveData[5], 0, 2)
    equippedBodyTier = loadWholeNumber(saveData[6], 0, 2)
    equippedBrakeTier = loadWholeNumber(saveData[7], 0, 2)

    let saveIndex = 8
    for (let index = 0; index < engineUnlocked.length; index++) {
        engineUnlocked[index] = loadBoolean(saveData[saveIndex])
        saveIndex += 1
    }
    for (let index = 0; index < wheelsUnlocked.length; index++) {
        wheelsUnlocked[index] = loadBoolean(saveData[saveIndex])
        saveIndex += 1
    }
    for (let index = 0; index < bodyUnlocked.length; index++) {
        bodyUnlocked[index] = loadBoolean(saveData[saveIndex])
        saveIndex += 1
    }
    for (let index = 0; index < brakesUnlocked.length; index++) {
        brakesUnlocked[index] = loadBoolean(saveData[saveIndex])
        saveIndex += 1
    }
    for (let index = 0; index < paintColorsUnlocked.length; index++) {
        paintColorsUnlocked[index] = loadBoolean(saveData[saveIndex])
        saveIndex += 1
    }

    // Starter equipment and colors must always remain available.
    engineUnlocked[0] = true
    wheelsUnlocked[0] = true
    bodyUnlocked[0] = true
    brakesUnlocked[0] = true
    paintColorsUnlocked[0] = true
    paintColorsUnlocked[5] = true
    paintColorsUnlocked[7] = true

    if (!engineUnlocked[equippedEngineTier]) {
        equippedEngineTier = 0
    }
    if (!wheelsUnlocked[equippedWheelTier]) {
        equippedWheelTier = 0
    }
    if (!bodyUnlocked[equippedBodyTier]) {
        equippedBodyTier = 0
    }
    if (!brakesUnlocked[equippedBrakeTier]) {
        equippedBrakeTier = 0
    }

    equippedPrimaryColor = loadOwnedPaintColor(saveData[35], 8)
    equippedSecondaryColor = loadOwnedPaintColor(saveData[36], 6)
    equippedAccentColor = loadOwnedPaintColor(saveData[37], 1)
    playerPaintRevision += 1
    return true
}

/** Removes the browser save and restores every permanent value to new-game defaults. */
function resetGameProgress() {
    settings.remove(racingSaveKey)

    cash = 0
    wins = 0
    racesRaced = 0
    engineUnlocked = [true, false, false]
    wheelsUnlocked = [true, false, false]
    bodyUnlocked = [true, false, false]
    brakesUnlocked = [true, false, false]
    equippedEngineTier = 0
    equippedWheelTier = 0
    equippedBodyTier = 0
    equippedBrakeTier = 0
    paintColorsUnlocked = [
        true, false, false, false, false,
        true, false, true, false, false,
        false, false, false, false, false
    ]
    equippedPrimaryColor = 8
    equippedSecondaryColor = 6
    equippedAccentColor = 1
    playerPaintRevision += 1
    recalculatePlayerStats()
}
