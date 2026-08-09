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

function selectedFreeRoamBaseMap(): tiles.TileMapData {
    if (selectedFreeRoamTheme == FreeRoamTheme.Highway) {
        return tilemap`freeRoamHighwayMap`
    } else if (selectedFreeRoamTheme == FreeRoamTheme.Cave) {
        return tilemap`freeRoamCaveMap`
    }
    return tilemap`freeRoamForestMap`
}

function isFreeRoamSpawnArea(column: number, row: number): boolean {
    return Math.abs(column - 16) <= 2 && Math.abs(row - 16) <= 2
}

/**
 * Randomizes forest ground and obstacles while keeping the central spawn clear.
 * Trees and rocks become walls; flowers are visual overlays.
 * @param map The cloned forest map to decorate.
 */
function randomizeForestDecorations(map: tiles.TileMapData) {
    tileUtil.forEachTileInMap(map, function (column, row, location) {
        if (isFreeRoamSpawnArea(column, row)) {
            return
        }

        if (tileUtil.tileIs(map, location, sprites.castle.tileGrass1)) {
            let decorationRoll = randint(0, 99)

            if (decorationRoll < 4) {
                tileUtil.setTileAt(map, location, assets.tile`forestTree`)
                tileUtil.setWallAt(map, location, true)
            } else if (decorationRoll < 7) {
                tileUtil.setTileAt(map, location, assets.tile`forestRock`)
                tileUtil.setWallAt(map, location, true)
            } else if (decorationRoll < 17) {
                tileUtil.setTileAt(map, location, sprites.castle.tileGrass2)
            } else if (decorationRoll < 26) {
                tileUtil.setTileAt(map, location, sprites.castle.tileGrass3)
            } else if (decorationRoll < 33) {
                tileUtil.coverTile(location, assets.tile`forestFlowers`)
            }
        }
    })
}

/**
 * Randomizes roadside grass and adds sparse road wear and solid traffic cones.
 * The central spawn area is never modified.
 * @param map The cloned highway map to decorate.
 */
function randomizeHighwayDecorations(map: tiles.TileMapData) {
    tileUtil.forEachTileInMap(map, function (column, row, location) {
        if (isFreeRoamSpawnArea(column, row)) {
            return
        }

        if (tileUtil.tileIs(map, location, sprites.castle.tileDarkGrass1)) {
            let grassRoll = randint(0, 99)

            if (grassRoll < 14) {
                tileUtil.setTileAt(map, location, sprites.castle.tileDarkGrass2)
            } else if (grassRoll < 25) {
                tileUtil.setTileAt(map, location, sprites.castle.tileDarkGrass3)
            }
        }
        else if (
            tileUtil.tileIs(map, location, sprites.vehicle.roadVertical) ||
            tileUtil.tileIs(map, location, sprites.vehicle.roadHorizontal)
        ) {
            let roadRoll = randint(0, 99)

            if (roadRoll < 5) {
                tileUtil.coverTile(location, assets.tile`highwayCrack`)
            } else if (roadRoll < 7) {
                tileUtil.coverTile(location, assets.tile`highwayCone`)
                tileUtil.setWallAt(map, location, true)
            }
        }
    })
}

/**
 * Applies the decoration rules for the currently selected Free Roam theme.
 * @param map The cloned base map that may be safely modified.
 */
function randomizeFreeRoamDecorations(map: tiles.TileMapData) {
    if (selectedFreeRoamTheme == FreeRoamTheme.Highway) {
        randomizeHighwayDecorations(map)
    } else {
        randomizeForestDecorations(map)
    }
}

/** Loads either the streamed Cave or a decorated clone of an authored map. */
function loadSelectedFreeRoamMap() {
    if (selectedFreeRoamTheme == FreeRoamTheme.Cave) {
        // The authored cave is the permanent center of the streamed world.
        // Its floor-only decorations are baked into stable tile variants.
        startCaveFreeRoamGeneration()
        return
    }

    let freeRoamMap = tileUtil.cloneMap(selectedFreeRoamBaseMap())
    tiles.setCurrentTilemap(freeRoamMap)
    randomizeFreeRoamDecorations(freeRoamMap)
}

/** Initializes the selected randomized Free Roam map and player. */
function startFreeRoam() {
    drivingSessionState = DrivingSessionState.FreeRoam
    loadSelectedFreeRoamMap()
    scene.setBackgroundColor(7)

    createPlayer(CarImageDirection.Right)
    let spawnTile = 16
    if (selectedFreeRoamTheme == FreeRoamTheme.Cave) {
        spawnTile = caveFreeRoamSpawnTile
    }
    tiles.placeOnTile(player, tiles.getTileLocation(spawnTile, spawnTile))
    startPlayerMovement()
    scene.cameraFollowSprite(player)

    game.splash(
        freeRoamThemeName() + " FREE ROAM",
        "Drive freely. Press B to return to the Garage."
    )
}

// B exits Free Roam
controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    if (drivingSessionState == DrivingSessionState.FreeRoam) {
        leaveCurrentDrivingSession()
        openGarage(startSelectedDrivingMode)
    }
})
