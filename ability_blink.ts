// Unlockable short-range Blink behavior shared by every Free Roam theme

let blinkAbilityReadyAt = 0
let blinkAbilityRangeTiles = 5
let blinkAbilityCooldownMilliseconds = 5000

/** True only while ability input may affect an active, unpaused Free Roam. */
function blinkAbilityInputAvailable() {
    return drivingSessionState == DrivingSessionState.FreeRoam &&
        player != null && !freeRoamMenuOpen
}

/** Clears transient Blink state when permanent progress is reset. */
function resetBlinkAbility() {
    blinkAbilityReadyAt = 0
}

function blinkAbilityCooldownRemaining() {
    return Math.max(0, blinkAbilityReadyAt - game.runtime())
}

function blinkAbilityIsReady() {
    return caveTeleportUnlocked && blinkAbilityCooldownRemaining() <= 0
}

/** Teleports cardinally without crossing walls or the streamed map boundary. */
function useBlinkAbility() {
    if (!blinkAbilityInputAvailable() || !caveTeleportUnlocked ||
        game.runtime() < blinkAbilityReadyAt) {
        return
    }

    let directionX = playerCarFacingX()
    let directionY = playerCarFacingY()
    let startTileX = Math.floor(player.x / freeRoamTileSize)
    let startTileY = Math.floor(player.y / freeRoamTileSize)
    let destinationTileX = startTileX
    let destinationTileY = startTileY

    // Every intermediate tile is checked, so Blink cannot cross a solid tile.
    for (let distance = 1;
        distance <= blinkAbilityRangeTiles;
        distance++) {
        let candidateTileX = startTileX + directionX * distance
        let candidateTileY = startTileY + directionY * distance
        if (candidateTileX < 0 ||
            candidateTileX >= freeRoamWindowTileSize ||
            candidateTileY < 0 ||
            candidateTileY >= freeRoamWindowTileSize) {
            break
        }

        let candidateLocation = tiles.getTileLocation(
            candidateTileX,
            candidateTileY
        )
        if (tiles.tileAtLocationIsWall(candidateLocation)) {
            break
        }

        destinationTileX = candidateTileX
        destinationTileY = candidateTileY
    }

    if (destinationTileX == startTileX &&
        destinationTileY == startTileY) {
        if (playerCarVisual) {
            playerCarVisual.sayText("BLINK BLOCKED", 900, false)
        }
        return
    }

    let destinationX = destinationTileX * freeRoamTileSize +
        freeRoamTileSize / 2
    let destinationY = destinationTileY * freeRoamTileSize +
        freeRoamTileSize / 2

    showBlinkAfterimages(
        player.x,
        player.y,
        destinationX,
        destinationY
    )

    player.setPosition(destinationX, destinationY)
    if (playerCarVisual) {
        playerCarVisual.setPosition(destinationX, destinationY)
    }

    blinkAbilityReadyAt = game.runtime() +
        blinkAbilityCooldownMilliseconds
    shakeRacingCamera(2, 120)
}

function tryUseBlinkAbility() {
    if (!blinkAbilityInputAvailable()) {
        return
    }

    if (!caveTeleportUnlocked) {
        showAbilityToast("BLINK LOCKED - EXPLORE CAVE", 2)
    } else if (blinkAbilityCooldownRemaining() > 0) {
        showAbilityToast("BLINK RECHARGING", 5)
    } else {
        useBlinkAbility()
    }
    refreshAbilityHud()
}
