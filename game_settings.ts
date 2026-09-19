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

/** Player-facing settings available before play and from the Garage. */
function showRacingSettingsMenu() {
    let leaveSettings = false

    while (!leaveSettings) {
        let soundChoice = "Sound: " + racingSettingState(racingSoundEnabled)
        let shakeChoice = "Camera Shake: " +
            racingSettingState(racingCameraShakeEnabled)
        let contrastChoice = "High Contrast HUD: " +
            racingSettingState(racingHighContrastHud)
        let effectsChoice = "Driving FX: " +
            racingSettingState(racingDrivingEffectsEnabled)
        story.showPlayerChoices(
            soundChoice,
            shakeChoice,
            contrastChoice,
            effectsChoice,
            "Back"
        )

        if (story.checkLastAnswer(soundChoice)) {
            racingSoundEnabled = !racingSoundEnabled
            saveRacingSettings()
        } else if (story.checkLastAnswer(shakeChoice)) {
            racingCameraShakeEnabled = !racingCameraShakeEnabled
            saveRacingSettings()
        } else if (story.checkLastAnswer(contrastChoice)) {
            racingHighContrastHud = !racingHighContrastHud
            saveRacingSettings()
            refreshPolishHudColors()
        } else if (story.checkLastAnswer(effectsChoice)) {
            racingDrivingEffectsEnabled = !racingDrivingEffectsEnabled
            saveRacingSettings()
            if (!racingDrivingEffectsEnabled) {
                clearDrivingEffects()
            }
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
