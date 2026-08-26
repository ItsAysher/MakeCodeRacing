// Persistent player progression and identity stored in browser settings

const racingSaveKey = "makecode-racing-save"
const racingPlayerNameKey = "makecode-racing-player-name"
const racingSaveVersion = 1
const racingSaveValueCount = 38
const racingMasterySaveValueCount = 49

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

    // Procedural worlds save only their seed and meaningful player changes;
    // the fixed streaming windows are rebuilt deterministically when revisited.
    saveData.push(freeRoamWorldSeed)
    saveData.push(freeRoamGenerationVersion)
    saveData.push(caveMasteryCollectedMaskForSave())
    saveData.push(caveMasteryReturnedCountForSave())
    saveData.push(caveMasteryCarriedStatueForSave())
    saveData.push(saveBoolean(caveMasteryTeleportUnlockedForSave()))
    saveData.push(forestMasteryWinsForSave())
    saveData.push(forestMasteryCompletedMaskForSave())
    saveData.push(saveBoolean(forestMasteryBoostUnlockedForSave()))
    saveData.push(highwayDriftChallengeMask)
    saveData.push(saveBoolean(highwayDriftUnlocked))
    settings.writeNumberArray(racingSaveKey, saveData)
}

/** Stores the player name separately so ordinary progression saves do not rewrite it. */
function savePlayerName() {
    settings.writeString(racingPlayerNameKey, playerName)
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

    // Version-1 saves created before Free Roam mastery remain compatible.
    // They receive a world seed lazily on their first subsequent Free Roam.
    freeRoamWorldSeed = 0
    freeRoamGenerationVersion = 1
    resetCaveMasteryProgress()
    resetForestMasteryProgress()
    highwayDriftChallengeMask = 0
    highwayDriftUnlocked = false
    if (saveData.length >= racingMasterySaveValueCount) {
        freeRoamWorldSeed = loadWholeNumber(
            saveData[38], 0, 1000000000
        )
        freeRoamGenerationVersion = loadWholeNumber(saveData[39], 1, 1)
        loadCaveMasteryProgress(
            loadWholeNumber(saveData[40], 0, 7),
            loadWholeNumber(saveData[41], 0, 3),
            loadWholeNumber(saveData[42], -1, 2),
            loadBoolean(saveData[43])
        )
        loadForestMasteryProgress(
            loadWholeNumber(saveData[44], 0, 3),
            loadWholeNumber(saveData[45], 0, 7),
            loadBoolean(saveData[46])
        )
        highwayDriftChallengeMask = loadWholeNumber(
            saveData[47], 0, 7
        )
        highwayDriftUnlocked = loadBoolean(saveData[48]) ||
            highwayCompletedDriftChallengeCount() >= 3
    }
    playerName = settings.readString(racingPlayerNameKey) || ""
    playerPaintRevision += 1
    return true
}

/** Removes the browser save and restores every permanent value to new-game defaults. */
function resetGameProgress() {
    settings.remove(racingSaveKey)
    settings.remove(racingPlayerNameKey)

    cash = 0
    wins = 0
    racesRaced = 0
    playerName = ""
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
    freeRoamWorldSeed = 0
    freeRoamGenerationVersion = 1
    resetCaveMasteryProgress()
    resetForestMasteryProgress()
    highwayDriftChallengeMask = 0
    highwayDriftUnlocked = false
    playerPaintRevision += 1
    recalculatePlayerStats()
}
