// Derived player ratings and movement values.
//
// This is the only script that converts equipped parts into car performance.
// Garage, movement, and health systems consume these values but do not
// calculate their own versions.

let playerRawSpeedRating = 0
let playerTopSpeedRating = 0
let playerAccelerationRating = 0
let playerBrakingRating = 0
let playerMaximumDurability = 0
let playerEfficiencyPercent = 0

// Physics values derived from the garage-facing ratings above.
let playerMaximumSpeed = 0
let playerDriveAcceleration = 0
let playerReverseMaximumSpeed = 0
let playerReverseAcceleration = 0
let playerBrakingDeceleration = 0
let playerBaseTurnRate = 0

/**
 * Rebuilds all player ratings and physics values from the equipped part tiers.
 * Call this after changing any equipped engine, wheels, body, or brakes.
 */
function recalculatePlayerStats() {
    playerRawSpeedRating =
        engineSpeedRatings[equippedEngineTier] +
        wheelSpeedRatings[equippedWheelTier]
    playerAccelerationRating =
        engineAccelerationRatings[equippedEngineTier] +
        wheelAccelerationRatings[equippedWheelTier]
    playerMaximumDurability = bodyMaximumDurabilities[equippedBodyTier]
    playerEfficiencyPercent = bodyEfficiencyPercents[equippedBodyTier]
    playerBrakingRating = brakeRatings[equippedBrakeTier]

    // Body efficiency determines how much engine/wheel speed is usable.
    playerTopSpeedRating =
        playerRawSpeedRating * playerEfficiencyPercent / 100

    // Convert garage ratings into MakeCode Arcade velocity values while
    // preserving the movement balance used before this refactor.
    playerMaximumSpeed = Math.max(55, playerTopSpeedRating * 3)
    playerDriveAcceleration = 24 + playerAccelerationRating * 8
    playerReverseMaximumSpeed = Math.min(40, playerMaximumSpeed * 0.45)
    playerReverseAcceleration = 14 + playerAccelerationRating * 5
    playerBrakingDeceleration = 40 + playerBrakingRating * 2
    playerBaseTurnRate = 4.5 + playerAccelerationRating * 0.45
}

/**
 * Reduces steering response as the car approaches maximum speed.
 * @param speedRatio Current speed divided by maximum speed, clamped to 0–1.
 * @returns The turn rate used for this movement update.
 */
function playerTurnRateAtSpeed(speedRatio: number) {
    return playerBaseTurnRate * (1 - speedRatio * 0.45)
}
