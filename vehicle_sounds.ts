// Player vehicle sound expressions.
//
// These values match the controls available in MakeCode Arcade's sound editor:
// waveform, starting/ending pitch, starting/ending volume, duration, effect,
// and interpolation curve.

let playerAccelerationSound = music.createSoundEffect(
    WaveShape.Sawtooth,
    80,
    150,
    55,
    85,
    140,
    SoundExpressionEffect.Vibrato,
    InterpolationCurve.Linear
)

let playerTurningSound = music.createSoundEffect(
    WaveShape.Noise,
    700,
    240,
    65,
    0,
    90,
    SoundExpressionEffect.Tremolo,
    InterpolationCurve.Curve
)

let playerWallCrashSound = music.createSoundEffect(
    WaveShape.Noise,
    180,
    40,
    255,
    0,
    220,
    SoundExpressionEffect.Tremolo,
    InterpolationCurve.Logarithmic
)

let nextPlayerDrivingSoundTime = -1000

/**
 * Allows acceleration and turning sounds to play immediately in a new session.
 */
function resetPlayerVehicleSoundTimers() {
    nextPlayerDrivingSoundTime = -1000
}

/**
 * Plays a short engine pulse while throttle is actively increasing speed.
 * The cooldown is longer than the sound, preventing overlapping engine pulses.
 */
function playPlayerAccelerationSound() {
    let now = control.millis()

    if (now < nextPlayerDrivingSoundTime) {
        return
    }

    nextPlayerDrivingSoundTime = now + 160
    music.play(playerAccelerationSound, music.PlaybackMode.InBackground)
}

/**
 * Plays a brief tire sound during a meaningful turn at driving speed.
 * @param turnSeverity Difference between current and requested direction, 0 to 1.
 * @param currentSpeed Current magnitude of the player's velocity.
 */
function playPlayerTurningSound(turnSeverity: number, currentSpeed: number) {
    let now = control.millis()

    if (
        currentSpeed < 20 ||
        turnSeverity < 0.08 ||
        now < nextPlayerDrivingSoundTime
    ) {
        return
    }

    nextPlayerDrivingSoundTime = now + 110
    music.play(playerTurningSound, music.PlaybackMode.InBackground)
}

/**
 * Plays the impact sound used when the player hits a solid wall tile.
 */
function playPlayerWallCrashSound() {
    nextPlayerDrivingSoundTime = control.millis() + 250
    music.play(playerWallCrashSound, music.PlaybackMode.InBackground)
}
