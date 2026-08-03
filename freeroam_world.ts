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
 * Adds cave rubble, moss, and crystals without blocking the main travel tunnels.
 * @param map The cloned cave map to decorate.
 */
function randomizeCaveDecorations(map: tiles.TileMapData) {
    tileUtil.forEachTileInMap(map, function (column, row, location) {
        if (isFreeRoamSpawnArea(column, row)) {
            return
        }

        let isCaveFloor =
            tileUtil.tileIs(map, location, sprites.dungeon.darkGroundCenter) ||
            tileUtil.tileIs(map, location, sprites.dungeon.darkGroundNorthWest1) ||
            tileUtil.tileIs(map, location, sprites.dungeon.darkGroundNorthEast1) ||
            tileUtil.tileIs(map, location, sprites.dungeon.darkGroundSouthWest1) ||
            tileUtil.tileIs(map, location, sprites.dungeon.darkGroundSouthEast1)

        if (isCaveFloor) {
            let decorationRoll = randint(0, 99)
            let isMainTunnel =
                (column >= 14 && column <= 17) ||
                (row >= 14 && row <= 17)

            if (decorationRoll < 4) {
                tileUtil.coverTile(location, assets.tile`caveRubble`)
            } else if (decorationRoll < 10 && !isMainTunnel) {
                // Crystals are solid, so keep them out of the four-tile-wide
                // tunnels that guarantee travel between repeated map edges.
                tileUtil.coverTile(location, assets.tile`caveCrystal`)
                tileUtil.setWallAt(map, location, true)
            } else if (decorationRoll < 17) {
                tileUtil.coverTile(location, assets.tile`caveMoss`)
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
    } else if (selectedFreeRoamTheme == FreeRoamTheme.Cave) {
        randomizeCaveDecorations(map)
    } else {
        randomizeForestDecorations(map)
    }
}

/**
 * Clones, activates, and decorates the selected Free Roam map.
 * Cloning prevents randomized changes from modifying the authored asset.
 */
function loadSelectedFreeRoamMap() {
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
    tiles.placeOnTile(player, tiles.getTileLocation(16, 16))
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
