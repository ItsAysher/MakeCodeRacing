enum FreeRoamTheme {
    Forest,
    Highway,
    Cave
}

let selectedFreeRoamTheme = FreeRoamTheme.Forest
let activeFreeRoamMap: tiles.TileMapData = null

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
        } else if (tileUtil.tileIs(map, location, assets.tile`highwayShoulder`)) {
            let shoulderRoll = randint(0, 99)

            if (shoulderRoll < 10) {
                tileUtil.setTileAt(map, location, assets.tile`highwayBarrier`)
                tileUtil.setWallAt(map, location, true)
            } else if (shoulderRoll < 17) {
                tileUtil.coverTile(location, assets.tile`highwayCone`)
            }
        } else if (
            tileUtil.tileIs(map, location, assets.tile`highwayAsphalt`) ||
            tileUtil.tileIs(map, location, sprites.vehicle.roadVertical) ||
            tileUtil.tileIs(map, location, sprites.vehicle.roadHorizontal)
        ) {
            let roadRoll = randint(0, 99)

            if (roadRoll < 5) {
                tileUtil.coverTile(location, assets.tile`highwayCrack`)
            } else if (roadRoll < 7) {
                tileUtil.coverTile(location, assets.tile`highwayCone`)
            }
        }
    })
}

function randomizeCaveDecorations(map: tiles.TileMapData) {
    tileUtil.forEachTileInMap(map, function (column, row, location) {
        if (isFreeRoamSpawnArea(column, row)) {
            return
        }

        let isCaveFloor =
            tileUtil.tileIs(map, location, sprites.dungeon.floorDark0) ||
            tileUtil.tileIs(map, location, sprites.dungeon.floorDark1)

        if (isCaveFloor) {
            let decorationRoll = randint(0, 99)
            let isMainTunnel =
                (column >= 14 && column <= 17) ||
                (row >= 14 && row <= 17)

            // Rubble is solid, so keep it out of the four-tile-wide tunnels
            // that guarantee travel between repeated map edges.
            if (decorationRoll < 4 && !isMainTunnel) {
                tileUtil.setTileAt(map, location, assets.tile`caveRubble`)
                tileUtil.setWallAt(map, location, true)
            } else if (decorationRoll < 10) {
                tileUtil.coverTile(location, assets.tile`caveCrystal`)
            } else if (decorationRoll < 17) {
                tileUtil.coverTile(location, assets.tile`caveMoss`)
            } else if (decorationRoll < 28) {
                if (tileUtil.tileIs(map, location, sprites.dungeon.floorDark0)) {
                    tileUtil.setTileAt(map, location, sprites.dungeon.floorDark1)
                } else {
                    tileUtil.setTileAt(map, location, sprites.dungeon.floorDark0)
                }
            }
        }
    })
}

function randomizeFreeRoamDecorations(map: tiles.TileMapData) {
    if (selectedFreeRoamTheme == FreeRoamTheme.Highway) {
        randomizeHighwayDecorations(map)
    } else if (selectedFreeRoamTheme == FreeRoamTheme.Cave) {
        randomizeCaveDecorations(map)
    } else {
        randomizeForestDecorations(map)
    }
}

function loadSelectedFreeRoamMap() {
    // Cloning protects the authored base. Each entry into Free Roam starts with
    // a fresh map, so random decorations never become part of the source asset.
    activeFreeRoamMap = tileUtil.cloneMap(selectedFreeRoamBaseMap())
    tiles.setCurrentTilemap(activeFreeRoamMap)
    randomizeFreeRoamDecorations(activeFreeRoamMap)
}

function clearFreeRoamMapState() {
    activeFreeRoamMap = null
}
