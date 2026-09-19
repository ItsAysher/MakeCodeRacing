enum FreeRoamAbility {
    Boost,
    Blink,
    Drift
}

let selectedFreeRoamAbility = FreeRoamAbility.Boost

function freeRoamAbilityName(ability: FreeRoamAbility) {
    if (ability == FreeRoamAbility.Blink) {
        return "Blink"
    } else if (ability == FreeRoamAbility.Drift) {
        return "Drift"
    }
    return "Boost"
}

function selectFreeRoamAbility(ability: FreeRoamAbility) {
    selectedFreeRoamAbility = ability
    saveRacingSettings()
    refreshAbilityHud()
}

function freeRoamAbilityIsUnlocked(ability: FreeRoamAbility) {
    if (ability == FreeRoamAbility.Boost) {
        return forestBoostUnlocked
    } else if (ability == FreeRoamAbility.Blink) {
        return caveTeleportUnlocked
    }
    return highwayDriftUnlocked
}

function cycleSelectedFreeRoamAbility() {
    let anyAbilityUnlocked = forestBoostUnlocked ||
        caveTeleportUnlocked || highwayDriftUnlocked
    if (anyAbilityUnlocked) {
        for (let offset = 1; offset <= 3; offset++) {
            let candidate = (selectedFreeRoamAbility + offset) % 3
            if (freeRoamAbilityIsUnlocked(candidate)) {
                selectFreeRoamAbility(candidate)
                showAbilityToast(
                    freeRoamAbilityName(candidate).toUpperCase() + " SELECTED",
                    7
                )
                return
            }
        }
    }

    // Before the first mastery unlock, still rotate the display so the HUD
    // previews the three goals instead of making the selector appear broken.
    selectFreeRoamAbility((selectedFreeRoamAbility + 1) % 3)
}

/** Controller-native special input that works in the simulator and on hardware. */
controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    if (drivingSessionState != DrivingSessionState.FreeRoam ||
        freeRoamMenuOpen || !player) {
        return
    }

    if (selectedFreeRoamAbility == FreeRoamAbility.Blink) {
        tryUseBlinkAbility()
    } else if (selectedFreeRoamAbility == FreeRoamAbility.Drift) {
        announceDriftAbilityInput()
    } else {
        tryUseBoostAbility()
    }
})
