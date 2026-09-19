// Product identity, player-facing settings, and accessibility helpers

const racingGameVersion = "0.9.0-polish"
const racingSettingsKey = "makecode-racing-settings"
const racingSettingsVersion = 1

let racingSoundEnabled = true
let racingCameraShakeEnabled = true
let racingHighContrastHud = false
let racingDrivingEffectsEnabled = true

/** Loads independent presentation settings without coupling them to progress. */
function loadRacingSettings() {
    let savedSettings = settings.readNumberArray(racingSettingsKey)
    if (!savedSettings || savedSettings.length < 4 ||
        savedSettings[0] != racingSettingsVersion) {
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
}

function saveRacingSettings() {
    settings.writeNumberArray(racingSettingsKey, [
        racingSettingsVersion,
        racingSoundEnabled ? 1 : 0,
        racingCameraShakeEnabled ? 1 : 0,
        racingHighContrastHud ? 1 : 0,
        selectedFreeRoamAbility,
        racingDrivingEffectsEnabled ? 1 : 0
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

        if (accessibilityPage == 0) {
            story.showPlayerChoices(
                contrastChoice, motionChoice, "More", "Back"
            )
        } else {
            story.showPlayerChoices(
                effectsChoice, cuesChoice, "More", "Back"
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
        } else if (story.checkLastAnswer("More")) {
            accessibilityPage = (accessibilityPage + 1) % 2
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
        let effectsChoice = "Driving FX: " +
            racingSettingState(racingDrivingEffectsEnabled)

        if (settingsPage == 0) {
            story.showPlayerChoices(
                soundChoice, "Accessibility", "More", "Back"
            )
        } else {
            story.showPlayerChoices(
                shakeChoice, effectsChoice, "More", "Back"
            )
        }

        if (story.checkLastAnswer(soundChoice)) {
            racingSoundEnabled = !racingSoundEnabled
            saveRacingSettings()
        } else if (story.checkLastAnswer("Accessibility")) {
            showRacingAccessibilityMenu()
        } else if (story.checkLastAnswer(shakeChoice)) {
            toggleRacingCameraShake()
        } else if (story.checkLastAnswer(effectsChoice)) {
            toggleRacingDrivingEffects()
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
