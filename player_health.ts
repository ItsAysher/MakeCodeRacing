// Player durability, health display, and damaging collisions

namespace StatusBarKind {
    export let Durability = StatusBarKind.create()
}

let playerHealthBar: StatusBarSprite = null
let playerRaceHealth = 0
let playerCarWrecked = false
let lastPlayerWallDamageTime = 0
let lastPlayerRacerDamageTime = 0

function createPlayerHealthBar() {
    if (playerHealthBar) {
        playerHealthBar.destroy()
    }

    playerHealthBar = statusbars.create(44, 6, StatusBarKind.Durability)
    playerHealthBar.max = durability
    playerHealthBar.value = playerRaceHealth
    playerHealthBar.setColor(7, 2, 4)
    playerHealthBar.setBarBorder(1, 15)
    playerHealthBar.setFlag(SpriteFlag.RelativeToCamera, true)
    playerHealthBar.setFlag(SpriteFlag.Ghost, true)
    playerHealthBar.z = 110
    playerHealthBar.right = 158
    playerHealthBar.top = 11
}

function startPlayerRaceHealth() {
    playerRaceHealth = durability
    playerCarWrecked = false
    lastPlayerWallDamageTime = 0
    lastPlayerRacerDamageTime = 0
    createPlayerHealthBar()
}

function stopPlayerRaceHealth() {
    if (playerHealthBar) {
        playerHealthBar.destroy()
        playerHealthBar = null
    }
}

function damagePlayerCar(amount: number) {
    if (!raceInProgress || !playerHealthBar || playerCarWrecked) {
        return
    }

    playerRaceHealth = Math.max(0, playerRaceHealth - amount)
    playerHealthBar.value = playerRaceHealth

    if (playerRaceHealth == 0) {
        playerCarWrecked = true
        player.sayText("WRECKED!", 1000, false)
        completeCurrentRace(false)
    }
}

function isPlayerCarWrecked() {
    return playerCarWrecked
}

sprites.onOverlap(SpriteKind.Player, SpriteKind.AIRacer, function (playerSprite, racer) {
    if (!raceInProgress ||
        control.millis() - lastPlayerRacerDamageTime < 700) {
        return
    }

    lastPlayerRacerDamageTime = control.millis()
    damagePlayerCar(12)

    // Bounce the cars apart so a single crash does not pin them together.
    playerSprite.vx = playerSprite.vx * -0.35
    playerSprite.vy = playerSprite.vy * -0.35
    racer.vx = racer.vx * -0.2
    racer.vy = racer.vy * -0.2
})

scene.onHitWall(SpriteKind.Player, function (sprite, location) {
    if (!raceInProgress ||
        control.millis() - lastPlayerWallDamageTime < 600) {
        return
    }

    lastPlayerWallDamageTime = control.millis()
    damagePlayerCar(8)
})
