// Compact custom race HUD for lap, position, and elapsed/remaining time

let raceHudSprite: Sprite = null
let raceBannerSprite: Sprite = null
let raceHudLastLap = -1
let raceHudLastPosition = -1
let raceHudLastSecond = -1

function drawRaceHudImage(hud: Image) {
    let foreground = racingHudForegroundColor()
    let border = racingHighContrastHud ? 5 : 11
    hud.fill(15)
    hud.drawRect(0, 0, hud.width, hud.height, border)
    hud.fillRect(1, 1, hud.width - 2, hud.height - 2, 1)

    let displayedLap = Math.min(
        activeRaceDefinition.lapTarget,
        raceLap + 1
    )
    let position = racePositionForPlayer()
    let racerCount = activeRaceDefinition.aiCount + 1
    let remainingMilliseconds = currentRaceRemainingMilliseconds()
    let remaining = Math.idiv(remainingMilliseconds + 999, 1000)

    hud.print(
        "LAP " + displayedLap + "/" + activeRaceDefinition.lapTarget,
        4,
        3,
        foreground,
        image.font5
    )
    hud.print(
        raceOrdinal(position) + "/" + racerCount,
        47,
        3,
        foreground,
        image.font5
    )
    hud.print(
        "TIME " + remaining,
        4,
        10,
        remaining <= 10 ? 2 : foreground,
        image.font5
    )
    if (racePlayerIsWrongWay()) {
        hud.fillRect(46, 9, 48, 7, 1)
        hud.print("WRONG WAY", 48, 10, 2, image.font5)
    }
    if (currentRaceLastLapMilliseconds > 0) {
        hud.print(
            "LAST " + formatRaceTime(currentRaceLastLapMilliseconds),
            47,
            10,
            7,
            image.font5
        )
    }
    return hud
}

function raceHudImage() {
    return drawRaceHudImage(image.create(96, 18))
}

function createRaceHud() {
    destroyRaceHud()
    raceHudSprite = sprites.create(raceHudImage(), SpriteKind.RaceHud)
    raceHudSprite.setFlag(SpriteFlag.RelativeToCamera, true)
    raceHudSprite.setFlag(SpriteFlag.Ghost, true)
    raceHudSprite.z = 120
    raceHudSprite.left = 1
    raceHudSprite.top = 1
    raceHudLastLap = raceLap
    raceHudLastPosition = racePositionForPlayer()
    raceHudLastSecond = Math.idiv(currentRaceRemainingMilliseconds(), 1000)
}

function refreshRaceHud() {
    if (raceHudSprite && activeRaceDefinition &&
        (drivingSessionState == DrivingSessionState.Race ||
            drivingSessionState == DrivingSessionState.RaceFinishing)) {
        // Redraw the existing framebuffer so a long race does not allocate a
        // new 96x18 image ten times per second on hardware.
        drawRaceHudImage(raceHudSprite.image)
    }
}

function destroyRaceHud() {
    if (raceHudSprite) {
        raceHudSprite.destroy()
        raceHudSprite = null
    }
    raceHudLastLap = -1
    raceHudLastPosition = -1
    raceHudLastSecond = -1
    if (raceBannerSprite) {
        raceBannerSprite.destroy()
        raceBannerSprite = null
    }
}

function showRaceBanner(message: string, color: number) {
    if (raceBannerSprite) {
        raceBannerSprite.destroy()
    }
    message = fitArcadeText(message, 138, image.font8)
    let width = Math.min(150, message.length * image.font8.charWidth + 12)
    let banner = image.create(width, 16)
    banner.fill(15)
    banner.drawRect(0, 0, width, 16, color)
    banner.print(
        message,
        centeredArcadeTextX(width, message, image.font8),
        4,
        color,
        image.font8
    )
    raceBannerSprite = sprites.create(banner, SpriteKind.RaceHud)
    raceBannerSprite.setFlag(SpriteFlag.RelativeToCamera, true)
    raceBannerSprite.setFlag(SpriteFlag.Ghost, true)
    raceBannerSprite.z = 125
    raceBannerSprite.x = 80
    raceBannerSprite.y = 36
    raceBannerSprite.lifespan = 1000
}

game.onUpdateInterval(100, function () {
    if (drivingSessionState != DrivingSessionState.Race ||
        !raceHudSprite) {
        return
    }

    let position = racePositionForPlayer()
    let remaining = Math.idiv(currentRaceRemainingMilliseconds(), 1000)
    if (raceHudLastLap != raceLap ||
        raceHudLastPosition != position ||
        raceHudLastSecond != remaining) {
        raceHudLastLap = raceLap
        raceHudLastPosition = position
        raceHudLastSecond = remaining
        refreshRaceHud()
    }
})
