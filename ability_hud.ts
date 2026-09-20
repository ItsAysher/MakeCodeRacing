// Free Roam ability selection, readiness, cooldown, and toast presentation

let abilityHudSprite: Sprite = null
let abilityToastSprite: Sprite = null
let abilityHudLastSignature = ""

function abilityStateLabel(ability: FreeRoamAbility) {
    if (ability == FreeRoamAbility.Boost) {
        if (!forestBoostUnlocked) {
            return "LOCK"
        } else if (boostAbilityActive) {
            return "ON"
        } else if (!boostAbilityIsReady()) {
            return Math.idiv(boostAbilityCooldownRemaining() + 999, 1000) + "s"
        }
        return "READY"
    } else if (ability == FreeRoamAbility.Blink) {
        if (!caveTeleportUnlocked) {
            return "LOCK"
        } else if (!blinkAbilityIsReady()) {
            return Math.idiv(blinkAbilityCooldownRemaining() + 999, 1000) + "s"
        }
        return "READY"
    }

    if (!highwayDriftUnlocked) {
        return "LOCK"
    }
    return driftAbilityIsActive() ? "ON" : "READY"
}

function abilityStateColor(ability: FreeRoamAbility) {
    let state = abilityStateLabel(ability)
    if (state == "LOCK") {
        return racingHighContrastHud ? 2 : 12
    } else if (state == "ON") {
        return 9
    } else if (state == "READY") {
        return 7
    }
    return 5
}

function abilityHudIcon(ability: FreeRoamAbility) {
    if (abilityStateLabel(ability) == "LOCK") {
        return assets.image`ability-lock-icon`
    } else if (ability == FreeRoamAbility.Boost) {
        return assets.image`ability-boost-icon`
    } else if (ability == FreeRoamAbility.Blink) {
        return assets.image`ability-blink-icon`
    }
    return assets.image`ability-drift-icon`
}

function abilityHudSignature() {
    return selectedFreeRoamAbility + ":" +
        abilityStateLabel(FreeRoamAbility.Boost) + ":" +
        abilityStateLabel(FreeRoamAbility.Blink) + ":" +
        abilityStateLabel(FreeRoamAbility.Drift) + ":" +
        (racingHighContrastHud ? 1 : 0)
}

function drawAbilityHud() {
    let hud = image.create(78, 29)
    let foreground = racingHudForegroundColor()
    hud.fill(15)
    hud.drawRect(0, 0, hud.width, hud.height, racingHighContrastHud ? 5 : 11)
    hud.fillRect(1, 1, hud.width - 2, hud.height - 2, 1)
    let labels = ["BST", "BLK", "DRF"]

    for (let index = 0; index < 3; index++) {
        let ability = index as FreeRoamAbility
        let rowY = 2 + index * 8
        hud.print(
            selectedFreeRoamAbility == ability ? ">" : " ",
            3,
            rowY + 1,
            selectedFreeRoamAbility == ability ? 5 : foreground,
            image.font5
        )
        hud.drawTransparentImage(abilityHudIcon(ability), 9, rowY)
        hud.print(labels[index], 20, rowY + 1, foreground, image.font5)
        hud.print(
            abilityStateLabel(ability),
            42,
            rowY + 1,
            abilityStateColor(ability),
            image.font5
        )
    }
    return hud
}

function createAbilityHud() {
    destroyAbilityHud()
    abilityHudSprite = sprites.create(drawAbilityHud(), SpriteKind.AbilityHud)
    abilityHudSprite.setFlag(SpriteFlag.RelativeToCamera, true)
    abilityHudSprite.setFlag(SpriteFlag.Ghost, true)
    abilityHudSprite.z = 115
    abilityHudSprite.left = 1
    abilityHudSprite.bottom = 118
    abilityHudLastSignature = abilityHudSignature()
}

function refreshAbilityHud() {
    if (abilityHudSprite) {
        abilityHudSprite.setImage(drawAbilityHud())
        abilityHudLastSignature = abilityHudSignature()
    }
}

function destroyAbilityHud() {
    if (abilityHudSprite) {
        abilityHudSprite.destroy()
        abilityHudSprite = null
    }
    if (abilityToastSprite) {
        abilityToastSprite.destroy()
        abilityToastSprite = null
    }
    abilityHudLastSignature = ""
}

function showAbilityToast(message: string, color: number) {
    if (abilityToastSprite) {
        abilityToastSprite.destroy()
    }
    message = fitArcadeText(message, 146, image.font5)
    let width = Math.min(154, message.length * image.font5.charWidth + 8)
    let toast = image.create(width, 12)
    toast.fill(15)
    toast.drawRect(0, 0, width, 12, color)
    toast.print(
        message,
        centeredArcadeTextX(width, message, image.font5),
        3,
        color,
        image.font5
    )
    abilityToastSprite = sprites.create(toast, SpriteKind.AbilityHud)
    abilityToastSprite.setFlag(SpriteFlag.RelativeToCamera, true)
    abilityToastSprite.setFlag(SpriteFlag.Ghost, true)
    abilityToastSprite.z = 125
    abilityToastSprite.setPosition(80, 18)
    abilityToastSprite.lifespan = 1200
}

game.onUpdateInterval(100, function () {
    if (drivingSessionState != DrivingSessionState.FreeRoam ||
        !abilityHudSprite) {
        return
    }
    let signature = abilityHudSignature()
    if (signature != abilityHudLastSignature) {
        refreshAbilityHud()
    }
})
