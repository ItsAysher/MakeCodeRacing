// Unlockable Boost behavior shared by every Free Roam theme

let boostAbilityActive = false
let boostAbilityEndsAt = 0
let boostAbilityReadyAt = 0
let boostAbilityBaseMaximumSpeed = 0
let boostAbilityDurationMilliseconds = 1800
let boostAbilityCooldownMilliseconds = 5000

/** True only while ability input may affect an active, unpaused Free Roam. */
function boostAbilityInputAvailable() {
    return drivingSessionState == DrivingSessionState.FreeRoam &&
        player != null && !freeRoamMenuOpen
}

/** Lets opponent balancing ignore the temporary 1.5x top-speed modifier. */
function playerMaximumSpeedWithoutBoost() {
    return boostAbilityActive ?
        boostAbilityBaseMaximumSpeed : playerMaximumSpeed
}

/** Starts Boost without permanently modifying the equipped car statistics. */
function useBoostAbility() {
    if (!boostAbilityInputAvailable() || !forestBoostUnlocked ||
        boostAbilityActive || game.runtime() < boostAbilityReadyAt) {
        return
    }

    boostAbilityBaseMaximumSpeed = playerMaximumSpeed
    playerMaximumSpeed = boostAbilityBaseMaximumSpeed * 1.5
    boostAbilityActive = true
    boostAbilityEndsAt = game.runtime() + boostAbilityDurationMilliseconds
    boostAbilityReadyAt = game.runtime() + boostAbilityCooldownMilliseconds

    let currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy)
    if (currentSpeed > 0) {
        let boostedSpeed = Math.min(
            playerMaximumSpeed,
            Math.max(currentSpeed * 1.25, boostAbilityBaseMaximumSpeed)
        )
        player.vx = player.vx * boostedSpeed / currentSpeed
        player.vy = player.vy * boostedSpeed / currentSpeed
    }
    if (playerCarVisual) {
        playerCarVisual.sayText("BOOST!", 700, false)
    }
}

/** Restores the ordinary speed cap and removes any excess boosted velocity. */
function endBoostAbility() {
    if (!boostAbilityActive) {
        return
    }

    playerMaximumSpeed = boostAbilityBaseMaximumSpeed
    if (player) {
        let currentSpeed = Math.sqrt(
            player.vx * player.vx + player.vy * player.vy
        )
        if (currentSpeed > playerMaximumSpeed) {
            player.vx = player.vx * playerMaximumSpeed / currentSpeed
            player.vy = player.vy * playerMaximumSpeed / currentSpeed
        }
    }
    boostAbilityActive = false
}

/** Clears transient Boost state when permanent progress is reset. */
function resetBoostAbility() {
    endBoostAbility()
    boostAbilityReadyAt = 0
}

boostAbilityButton.onEvent(
    browserEvents.KeyEvent.Pressed,
    function () {
        if (!boostAbilityInputAvailable()) {
            return
        }

        if (!forestBoostUnlocked) {
            if (playerCarVisual) {
                playerCarVisual.sayText(
                    "Boost locked. Explore Forest",
                    1500,
                    false
                )
            }
        } else if (!boostAbilityActive &&
            game.runtime() < boostAbilityReadyAt) {
            if (playerCarVisual) {
                playerCarVisual.sayText("BOOST RECHARGING", 700, false)
            }
        } else {
            useBoostAbility()
        }
    }
)

game.onUpdate(function () {
    if (boostAbilityActive &&
        (game.runtime() >= boostAbilityEndsAt ||
            drivingSessionState != DrivingSessionState.FreeRoam ||
            freeRoamMenuOpen || !player)) {
        endBoostAbility()
    }
})
