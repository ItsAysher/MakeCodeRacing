// Product identity, player-facing settings, and accessibility helpers

const racingGameVersion = "1.0.0-polish"
const racingSettingsKey = "makecode-racing-settings"
const racingSettingsVersion = 2

let racingSoundEnabled = true
let racingCameraShakeEnabled = true
let racingHighContrastHud = false
let racingDrivingEffectsEnabled = true

/** Loads independent presentation settings without coupling them to progress. */
function loadRacingSettings() {
    let savedSettings = settings.readNumberArray(racingSettingsKey)
    if (!savedSettings || savedSettings.length < 4) {
        return
    }

    // Version 1 did not contain driving assists. Keep loading its established
    // fields and preserve its unassisted handling until the player opts in.
    let savedVersion = savedSettings[0]
    if (savedVersion < 1 || savedVersion > racingSettingsVersion) {
        return
    }

    racingSoundEnabled = savedSettings[1] != 0
    racingCameraShakeEnabled = savedSettings[2] != 0
    racingHighContrastHud = savedSettings[3] != 0
    if (savedSettings.length >= 5) {
        selectedFreeRoamAbility = loadWholeNumber(
            savedSettings[4], 0, 2
        ) as FreeRoamAbility
    }
    if (savedSettings.length >= 6) {
        racingDrivingEffectsEnabled = savedSettings[5] != 0
    }
    if (savedVersion >= 2 && savedSettings.length >= 9) {
        racingDrivingDifficultyPreset = loadWholeNumber(
            savedSettings[6],
            DrivingDifficultyPreset.Relaxed,
            DrivingDifficultyPreset.Precision
        ) as DrivingDifficultyPreset
        racingSteeringAssistEnabled = savedSettings[7] != 0
        racingBrakingAssistEnabled = savedSettings[8] != 0
    } else if (savedVersion == 1) {
        racingSteeringAssistEnabled = false
        racingBrakingAssistEnabled = false
    }
}

function saveRacingSettings() {
    settings.writeNumberArray(racingSettingsKey, [
        racingSettingsVersion,
        racingSoundEnabled ? 1 : 0,
        racingCameraShakeEnabled ? 1 : 0,
        racingHighContrastHud ? 1 : 0,
        selectedFreeRoamAbility,
        racingDrivingEffectsEnabled ? 1 : 0,
        racingDrivingDifficultyPreset,
        racingSteeringAssistEnabled ? 1 : 0,
        racingBrakingAssistEnabled ? 1 : 0
    ])
}

function racingSettingState(value: boolean) {
    return value ? "ON" : "OFF"
}

/** Applies camera motion only when the player has left it enabled. */
function shakeRacingCamera(intensity: number, duration: number) {
    if (racingCameraShakeEnabled) {
        scene.cameraShake(intensity, duration)
    }
}

/** Shared high-contrast foreground chosen by all custom HUDs. */
function racingHudForegroundColor() {
    return racingHighContrastHud ? 1 : 15
}

/** Lets presentation modules avoid starting new sound effects when muted. */
function racingSoundsAreEnabled() {
    return racingSoundEnabled
}

function toggleRacingCameraShake() {
    racingCameraShakeEnabled = !racingCameraShakeEnabled
    saveRacingSettings()
}

function toggleRacingDrivingEffects() {
    racingDrivingEffectsEnabled = !racingDrivingEffectsEnabled
    saveRacingSettings()
    if (!racingDrivingEffectsEnabled) {
        clearDrivingEffects()
    }
}

/** Four-slot controller menu for assists that never alter event difficulty. */
function showRacingDrivingAssistMenu() {
    let leaveAssists = false
    let assistPage = 0

    while (!leaveAssists) {
        let presetChoice = "Driving Difficulty: " +
            drivingDifficultyPresetName(racingDrivingDifficultyPreset)
        let steeringChoice = "Steering Assist: " +
            racingSettingState(racingSteeringAssistEnabled)
        let brakingChoice = "Brake Assist: " +
            racingSettingState(racingBrakingAssistEnabled)
        let guideChoice = "How Assists Work"

        if (assistPage == 0) {
            story.showPlayerChoices(
                presetChoice, steeringChoice, "More", "Back"
            )
        } else {
            story.showPlayerChoices(
                brakingChoice, guideChoice, "More", "Back"
            )
        }

        if (story.checkLastAnswer(presetChoice)) {
            cycleDrivingDifficultyPreset()
        } else if (story.checkLastAnswer(steeringChoice)) {
            racingSteeringAssistEnabled = !racingSteeringAssistEnabled
            saveRacingSettings()
        } else if (story.checkLastAnswer(brakingChoice)) {
            racingBrakingAssistEnabled = !racingBrakingAssistEnabled
            saveRacingSettings()
        } else if (story.checkLastAnswer(guideChoice)) {
            game.showLongText(
                "STEERING ASSIST adds a small amount of response only while you steer. " +
                    "BRAKE ASSIST gently trims speed in hard, fast corners and never stops the car. " +
                    "Driving Difficulty changes assist strength, not race opponents or rewards.",
                DialogLayout.Full
            )
        } else if (story.checkLastAnswer("More")) {
            assistPage = (assistPage + 1) % 2
        } else {
            leaveAssists = true
        }
    }
}

/** Keeps readability and sensory controls in a dedicated four-slot submenu. */
function showRacingAccessibilityMenu() {
    let leaveAccessibility = false
    let accessibilityPage = 0

    while (!leaveAccessibility) {
        let contrastChoice = "High Contrast HUD: " +
            racingSettingState(racingHighContrastHud)
        let motionChoice = "Camera Motion: " +
            racingSettingState(racingCameraShakeEnabled)
        let effectsChoice = "Driving FX: " +
            racingSettingState(racingDrivingEffectsEnabled)
        let cuesChoice = "Sound Cues: " +
            racingSettingState(racingSoundEnabled)
        let assistsChoice = "Driving Assists"
        let presetChoice = "Difficulty: " +
            drivingDifficultyPresetName(racingDrivingDifficultyPreset)

        if (accessibilityPage == 0) {
            story.showPlayerChoices(
                contrastChoice, motionChoice, "More", "Back"
            )
        } else if (accessibilityPage == 1) {
            story.showPlayerChoices(
                effectsChoice, cuesChoice, "More", "Back"
            )
        } else {
            story.showPlayerChoices(
                assistsChoice, presetChoice, "More", "Back"
            )
        }

        if (story.checkLastAnswer(contrastChoice)) {
            racingHighContrastHud = !racingHighContrastHud
            saveRacingSettings()
            refreshPolishHudColors()
        } else if (story.checkLastAnswer(motionChoice)) {
            toggleRacingCameraShake()
        } else if (story.checkLastAnswer(effectsChoice)) {
            toggleRacingDrivingEffects()
        } else if (story.checkLastAnswer(cuesChoice)) {
            racingSoundEnabled = !racingSoundEnabled
            saveRacingSettings()
        } else if (story.checkLastAnswer(assistsChoice)) {
            showRacingDrivingAssistMenu()
        } else if (story.checkLastAnswer(presetChoice)) {
            cycleDrivingDifficultyPreset()
        } else if (story.checkLastAnswer("More")) {
            accessibilityPage = (accessibilityPage + 1) % 3
        } else {
            leaveAccessibility = true
        }
    }
}

/** Player-facing settings available before play and from the Garage. */
function showRacingSettingsMenu() {
    let leaveSettings = false
    let settingsPage = 0

    while (!leaveSettings) {
        let soundChoice = "Sound: " + racingSettingState(racingSoundEnabled)
        let shakeChoice = "Camera Shake: " +
            racingSettingState(racingCameraShakeEnabled)
        let assistsChoice = "Driving Assists"

        if (settingsPage == 0) {
            story.showPlayerChoices(
                soundChoice, "Accessibility", "More", "Back"
            )
        } else {
            story.showPlayerChoices(
                shakeChoice, assistsChoice, "More", "Back"
            )
        }

        if (story.checkLastAnswer(soundChoice)) {
            racingSoundEnabled = !racingSoundEnabled
            saveRacingSettings()
        } else if (story.checkLastAnswer("Accessibility")) {
            showRacingAccessibilityMenu()
        } else if (story.checkLastAnswer(shakeChoice)) {
            toggleRacingCameraShake()
        } else if (story.checkLastAnswer(assistsChoice)) {
            showRacingDrivingAssistMenu()
        } else if (story.checkLastAnswer("More")) {
            settingsPage = (settingsPage + 1) % 2
        } else {
            leaveSettings = true
        }
    }
}

/** Safe hook implemented by HUD modules as they are created. */
function refreshPolishHudColors() {
    refreshRaceHud()
    refreshAbilityHud()
    refreshPlayerHealthBarColors()
}
