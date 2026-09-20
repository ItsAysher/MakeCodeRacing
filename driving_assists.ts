// Optional input assists, independent from each event's race difficulty.

enum DrivingDifficultyPreset {
    Relaxed,
    Balanced,
    Precision
}

// Balanced keeps the default feel close to the original handling. Existing
// version-1 settings migrate to these values without losing any saved options.
let racingDrivingDifficultyPreset = DrivingDifficultyPreset.Balanced
let racingSteeringAssistEnabled = true
let racingBrakingAssistEnabled = false

function drivingDifficultyPresetName(preset: DrivingDifficultyPreset) {
    if (preset == DrivingDifficultyPreset.Relaxed) {
        return "RELAXED"
    } else if (preset == DrivingDifficultyPreset.Precision) {
        return "PRECISION"
    }
    return "BALANCED"
}

/** Cycles handling assistance without changing opponents, rewards, or events. */
function cycleDrivingDifficultyPreset() {
    racingDrivingDifficultyPreset =
        (racingDrivingDifficultyPreset + 1) % 3
    saveRacingSettings()
}

/** Extra player-requested steering response for the selected preset. */
function drivingSteeringAssistMultiplier(
    speedRatio: number,
    inputAlignment: number
) {
    if (!racingSteeringAssistEnabled || inputAlignment < -0.5) {
        return 1
    }

    let strength = 0.28
    if (racingDrivingDifficultyPreset ==
        DrivingDifficultyPreset.Relaxed) {
        strength = 0.5
    } else if (racingDrivingDifficultyPreset ==
        DrivingDifficultyPreset.Precision) {
        strength = 0.12
    }

    // The multiplier is zero without steering disagreement, so the assist
    // cannot choose a direction or move a stationary car on its own.
    let turnSeverity = Math.max(0, (1 - inputAlignment) / 2)
    return 1 + strength * speedRatio * turnSeverity
}

/**
 * Gently trims only excess corner-entry speed. A hard floor preserves player
 * control, and straight-line acceleration is never affected.
 */
function applyDrivingBrakingAssist(
    currentSpeed: number,
    speedRatio: number,
    turnSeverity: number,
    deltaTime: number
) {
    if (!racingBrakingAssistEnabled || speedRatio < 0.5 ||
        turnSeverity < 0.12) {
        return currentSpeed
    }

    let deceleration = 9
    let minimumSpeedRatio = 0.52
    if (racingDrivingDifficultyPreset ==
        DrivingDifficultyPreset.Relaxed) {
        deceleration = 15
        minimumSpeedRatio = 0.46
    } else if (racingDrivingDifficultyPreset ==
        DrivingDifficultyPreset.Precision) {
        deceleration = 5
        minimumSpeedRatio = 0.58
    }

    let speedPressure = Math.min(1, (speedRatio - 0.5) * 2)
    let cornerPressure = Math.min(1, (turnSeverity - 0.12) / 0.88)
    let assistedFloor = playerMaximumSpeed * minimumSpeedRatio
    if (currentSpeed <= assistedFloor) {
        return currentSpeed
    }
    return Math.max(
        assistedFloor,
        currentSpeed - deceleration * speedPressure *
            cornerPressure * deltaTime
    )
}
