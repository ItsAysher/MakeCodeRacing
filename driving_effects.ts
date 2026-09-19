// Rate-limited, hardware-conscious driving feedback sprites

let lastBoostTrailEffectAt = 0
let lastDriftMarkEffectAt = 0
let maximumDrivingEffectSprites = 18

function drivingEffectsHaveCapacity() {
    return racingDrivingEffectsEnabled &&
        sprites.allOfKind(SpriteKind.DrivingEffect).length <
        maximumDrivingEffectSprites
}

function clearDrivingEffects() {
    for (let effect of sprites.allOfKind(SpriteKind.DrivingEffect)) {
        effect.destroy()
    }
}

function createDrivingEffect(
    effectImage: Image,
    x: number,
    y: number,
    lifespan: number,
    z: number
) {
    if (!drivingEffectsHaveCapacity()) {
        return null
    }
    let effect = sprites.create(effectImage, SpriteKind.DrivingEffect)
    effect.setFlag(SpriteFlag.Ghost, true)
    effect.setPosition(x, y)
    effect.z = z
    effect.lifespan = lifespan
    return effect
}

/** Starts the update-driven trail; individual particles remain rate limited. */
function showBoostTrail() {
    lastBoostTrailEffectAt = 0
    shakeRacingCamera(1, 90)
}

function showBlinkAfterimages(
    startX: number,
    startY: number,
    destinationX: number,
    destinationY: number
) {
    if (!playerCarVisual) {
        return
    }

    for (let step = 0; step < 4; step++) {
        let afterimage = playerCarVisual.image.clone()
        for (let x = 0; x < afterimage.width; x++) {
            for (let y = 0; y < afterimage.height; y++) {
                if (afterimage.getPixel(x, y) != 0) {
                    afterimage.setPixel(x, y, step % 2 == 0 ? 9 : 11)
                }
            }
        }
        let progress = step / 3
        createDrivingEffect(
            afterimage,
            startX + (destinationX - startX) * progress,
            startY + (destinationY - startY) * progress,
            180 + step * 55,
            player.z
        )
    }
}

function showImpactEffect(x: number, y: number) {
    let sparkImage = img`
        . 5 .
        5 1 5
        . 5 .
    `
    for (let index = 0; index < 4; index++) {
        let spark = createDrivingEffect(
            sparkImage,
            x + randint(-5, 5),
            y + randint(-5, 5),
            180 + index * 35,
            14
        )
        if (spark) {
            spark.vx = randint(-18, 18)
            spark.vy = randint(-18, 18)
        }
    }
    shakeRacingCamera(2, 100)
}

function emitBoostTrail() {
    if (!playerCarVisual || !player || !drivingEffectsHaveCapacity()) {
        return
    }
    let trail = img`
        . 9 .
        9 5 9
        . 9 .
    `
    let distanceBehind = 8
    let trailX = player.x - playerCarFacingX() * distanceBehind
    let trailY = player.y - playerCarFacingY() * distanceBehind
    let effect = createDrivingEffect(
        trail,
        trailX + randint(-2, 2),
        trailY + randint(-2, 2),
        260,
        player.z - 1
    )
    if (effect) {
        effect.vx = -player.vx * 0.08
        effect.vy = -player.vy * 0.08
    }
}

function emitDriftMark() {
    if (!player || !drivingEffectsHaveCapacity()) {
        return
    }
    createDrivingEffect(
        img`
            f f
            f f
        `,
        player.x,
        player.y,
        900,
        2
    )
}

game.onUpdate(function () {
    let now = control.millis()
    if (boostAbilityActive && now - lastBoostTrailEffectAt >= 90) {
        lastBoostTrailEffectAt = now
        emitBoostTrail()
    }
    if (driftAbilityIsActive() && now - lastDriftMarkEffectAt >= 130) {
        lastDriftMarkEffectAt = now
        emitDriftMark()
    }
})
