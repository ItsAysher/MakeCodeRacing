// Unlockable tighter-turning Drift behavior shared by every Free Roam theme

/** True only while ability input may affect an active, unpaused Free Roam. */
function driftAbilityInputAvailable() {
    return drivingSessionState == DrivingSessionState.FreeRoam &&
        player != null && !freeRoamMenuOpen
}

/** True while holding the unlocked Drift key during any Free Roam theme. */
function driftAbilityIsActive() {
    return driftAbilityInputAvailable() && highwayDriftUnlocked &&
        driftAbilityButton.isPressed()
}

/**
 * Blends extra steering after ordinary movement while preserving speed.
 * Braking, reversing, and opposite input keep their normal precedence.
 */
function updateDriftAbility() {
    if (!driftAbilityIsActive() || playerReversing ||
        controller.A.isPressed()) {
        return
    }

    let inputX = (controller.right.isPressed() ? 1 : 0) -
        (controller.left.isPressed() ? 1 : 0)
    let inputY = (controller.down.isPressed() ? 1 : 0) -
        (controller.up.isPressed() ? 1 : 0)
    let inputLength = Math.sqrt(inputX * inputX + inputY * inputY)
    let speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy)
    if (inputLength == 0 || speed < playerShiftSpeed) {
        return
    }

    inputX /= inputLength
    inputY /= inputLength
    let directionX = player.vx / speed
    let directionY = player.vy / speed
    let alignment = directionX * inputX + directionY * inputY

    if (alignment < -0.25) {
        return
    }

    let speedRatio = Math.min(1, speed / playerMaximumSpeed)
    let extraTurnRate = playerTurnRateAtSpeed(speedRatio) * 0.9
    let turnBlend = Math.min(
        1,
        extraTurnRate * game.eventContext().deltaTime
    )
    directionX = directionX * (1 - turnBlend) + inputX * turnBlend
    directionY = directionY * (1 - turnBlend) + inputY * turnBlend

    let directionLength = Math.sqrt(
        directionX * directionX + directionY * directionY
    )
    if (directionLength > 0) {
        player.vx = directionX * speed / directionLength
        player.vy = directionY * speed / directionLength
        updatePlayerCarImage()
    }
}

driftAbilityButton.onEvent(browserEvents.KeyEvent.Pressed, function () {
    if (!driftAbilityInputAvailable()) {
        return
    }

    if (!highwayDriftUnlocked) {
        if (playerCarVisual) {
            playerCarVisual.sayText(
                "Drift locked. Explore Highway",
                1500,
                false
            )
        }
    } else if (playerCarVisual) {
        playerCarVisual.sayText("DRIFT", 450, false)
    }
})

game.onUpdate(function () {
    updateDriftAbility()
})
