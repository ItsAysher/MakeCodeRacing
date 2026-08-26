// Shared logical tile coordinates for every Free Roam theme

let freeRoamCoordinateOriginWorldTileX = 0
let freeRoamCoordinateOriginWorldTileY = 0
let freeRoamCoordinateOriginInitialized = false

/** Captures the player's actual spawn tile as the coordinate origin. */
function initializeFreeRoamCoordinates() {
    freeRoamCoordinateOriginWorldTileX = freeRoamPlayerWorldTileX()
    freeRoamCoordinateOriginWorldTileY = freeRoamPlayerWorldTileY()
    freeRoamCoordinateOriginInitialized = true
}

/** Horizontal tile displacement from spawn; positive values are to the right. */
function freeRoamPlayerCoordinateX() {
    if (!freeRoamCoordinateOriginInitialized || !player) {
        return 0
    }
    return freeRoamPlayerWorldTileX() -
        freeRoamCoordinateOriginWorldTileX
}

/** Vertical tile displacement from spawn; positive values are downward. */
function freeRoamPlayerCoordinateY() {
    if (!freeRoamCoordinateOriginInitialized || !player) {
        return 0
    }
    return freeRoamPlayerWorldTileY() -
        freeRoamCoordinateOriginWorldTileY
}

/** Compact map-header form of the current spawn-relative tile coordinate. */
function freeRoamPlayerCoordinateText() {
    return "(" + freeRoamPlayerCoordinateX() + "," +
        freeRoamPlayerCoordinateY() + ")"
}
