// Player durability, health display, and damaging collisions

let playerHealthBar: Sprite = null
let playerRaceHealth = 0
let playerCarWrecked = false
let lastPlayerWallImpactTime = 0
let lastPlayerRacerDamageTime = 0

/**
 * Replaces the durability HUD and positions it in the upper-right corner.
 * Its maximum comes from the currently equipped body.
 */
function createPlayerHealthBar() {
    if (playerHealthBar) {
        playerHealthBar.destroy()
    }

    playerHealthBar = sprites.create(
        playerHealthBarImage(),
        SpriteKind.RaceHud
    )
    playerHealthBar.setFlag(SpriteFlag.RelativeToCamera, true)
    playerHealthBar.setFlag(SpriteFlag.Ghost, true)
    playerHealthBar.z = 110
    playerHealthBar.right = 158
    playerHealthBar.top = 11
}

/** Draws a fixed-allocation durability meter without a general HUD extension. */
function playerHealthBarImage() {
    let bar = image.create(44, 6)
    let fillColor = racingHighContrastHud ? 1 : 7
    let fillWidth = playerMaximumDurability > 0 ? Math.floor(
        42 * playerRaceHealth / playerMaximumDurability
    ) : 0
    bar.fill(15)
    bar.fillRect(1, 1, 42, 4, 2)
    if (fillWidth > 0) {
        bar.fillRect(1, 1, fillWidth, 4, fillColor)
    }
    return bar
}

function refreshPlayerHealthBarColors() {
    if (!playerHealthBar) {
        return
    }
    playerHealthBar.setImage(playerHealthBarImage())
}

/**
 * Resets durability and collision cooldowns, then creates the race HUD.
 */
function startPlayerRaceHealth() {
    playerRaceHealth = playerMaximumDurability
    playerCarWrecked = false
    lastPlayerWallImpactTime = 0
    lastPlayerRacerDamageTime = 0
    createPlayerHealthBar()
}

function stopPlayerRaceHealth() {
    if (playerHealthBar) {
        playerHealthBar.destroy()
        playerHealthBar = null
    }
}

/**
 * Applies durability damage and ends the race when the car becomes wrecked.
 * Damage is ignored outside races or after the car has already been wrecked.
 * @param amount Durability points to remove.
 */
function damagePlayerCar(amount: number) {
    if (drivingSessionState != DrivingSessionState.Race ||
        !playerHealthBar ||
        playerCarWrecked) {
        return
    }

    playerRaceHealth = Math.max(0, playerRaceHealth - amount)
    playerHealthBar.setImage(playerHealthBarImage())

    if (playerRaceHealth <= 0) {
        playerCarWrecked = true
        player.sayText("WRECKED!", 1000, false)
        completeCurrentRace(false)
    }
}

function isPlayerCarWrecked() {
    return playerCarWrecked
}

// Damages and separates colliding cars, with a cooldown to prevent rapid hits.
sprites.onOverlap(SpriteKind.Player, SpriteKind.AIRacer, function (playerSprite, racer) {
    let now = control.millis()
    if (drivingSessionState != DrivingSessionState.Race ||
        now - lastPlayerRacerDamageTime < 700) {
        return
    }

    lastPlayerRacerDamageTime = now
    damagePlayerCar(12)
    playPlayerWallCrashSound()
    showImpactEffect(
        (playerSprite.x + racer.x) / 2,
        (playerSprite.y + racer.y) / 2
    )

    // Bounce the cars apart so a single crash does not pin them together.
    playerSprite.vx = playerSprite.vx * -0.35
    playerSprite.vy = playerSprite.vy * -0.35
    racer.vx = racer.vx * -0.2
    racer.vy = racer.vy * -0.2
})

// Applies wall damage at most once per cooldown interval.
scene.onHitWall(SpriteKind.Player, function (sprite, location) {
    let now = control.millis()
    if ((drivingSessionState != DrivingSessionState.Race &&
        drivingSessionState != DrivingSessionState.FreeRoam) ||
        now - lastPlayerWallImpactTime < 600) {
        return
    }

    lastPlayerWallImpactTime = now
    playPlayerWallCrashSound()
    showImpactEffect(sprite.x, sprite.y)

    if (drivingSessionState == DrivingSessionState.Race) {
        damagePlayerCar(8)
    }
})
