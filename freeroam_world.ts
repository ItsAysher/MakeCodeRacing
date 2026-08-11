enum FreeRoamTheme {
    Forest,
    Highway,
    Cave
}

let selectedFreeRoamTheme = FreeRoamTheme.Forest

function freeRoamThemeName(): string {
    if (selectedFreeRoamTheme == FreeRoamTheme.Highway) {
        return "HIGHWAY"
    } else if (selectedFreeRoamTheme == FreeRoamTheme.Cave) {
        return "CAVE"
    }
    return "FOREST"
}

/** Logical world tile occupied by the player in the selected generator. */
function freeRoamPlayerWorldTileX() {
    if (selectedFreeRoamTheme == FreeRoamTheme.Forest) {
        return forestFreeRoamPlayerWorldTileX()
    } else if (selectedFreeRoamTheme == FreeRoamTheme.Highway) {
        return highwayFreeRoamPlayerWorldTileX()
    }
    return freeRoamSpriteWorldTileX(
        caveFreeRoamCenterWorldSectionX(), player
    )
}

function freeRoamPlayerWorldTileY() {
    if (selectedFreeRoamTheme == FreeRoamTheme.Forest) {
        return forestFreeRoamPlayerWorldTileY()
    } else if (selectedFreeRoamTheme == FreeRoamTheme.Highway) {
        return highwayFreeRoamPlayerWorldTileY()
    }
    return freeRoamSpriteWorldTileY(
        caveFreeRoamCenterWorldSectionY(), player
    )
}

/** Logical center of each theme's definitive authored home map. */
function freeRoamHomeWorldTileX() {
    if (selectedFreeRoamTheme == FreeRoamTheme.Forest) {
        return forestFreeRoamHomeWorldTileX()
    } else if (selectedFreeRoamTheme == FreeRoamTheme.Highway) {
        return highwayFreeRoamHomeWorldTileX()
    }
    return caveFreeRoamHomeWorldTileX()
}

function freeRoamHomeWorldTileY() {
    if (selectedFreeRoamTheme == FreeRoamTheme.Forest) {
        return forestFreeRoamHomeWorldTileY()
    } else if (selectedFreeRoamTheme == FreeRoamTheme.Highway) {
        return highwayFreeRoamHomeWorldTileY()
    }
    return caveFreeRoamHomeWorldTileY()
}

/** Initializes the selected randomized Free Roam map and player. */
function startFreeRoam() {
    drivingSessionState = DrivingSessionState.FreeRoam
    startSelectedFreeRoamGeneration()
    scene.setBackgroundColor(7)

    createPlayer(CarImageDirection.Right)
    let spawnTile = forestFreeRoamSpawnTile
    if (selectedFreeRoamTheme == FreeRoamTheme.Highway) {
        spawnTile = highwayFreeRoamSpawnTile
    } else if (selectedFreeRoamTheme == FreeRoamTheme.Cave) {
        spawnTile = caveFreeRoamSpawnTile
    }
    tiles.placeOnTile(player, tiles.getTileLocation(spawnTile, spawnTile))
    startPlayerMovement()
    scene.cameraFollowSprite(player)

    game.splash(
        freeRoamThemeName() + " FREE ROAM",
        "Drive freely. Press M for the Free Roam menu."
    )
}
