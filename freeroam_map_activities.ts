// Persistent discovery state shared by all Free Roam activity map markers

let freeRoamMapActivityCount = 3

let forestMapActivityDiscoveredMask = 0
let forestMapActivityWorldTileXs = [0, 0, 0]
let forestMapActivityWorldTileYs = [0, 0, 0]

let highwayMapActivityDiscoveredMask = 0
let highwayMapActivityWorldTileXs = [0, 0, 0]
let highwayMapActivityWorldTileYs = [0, 0, 0]

let caveMapActivityDiscoveredMask = 0
let caveMapActivityWorldTileXs = [0, 0, 0]
let caveMapActivityWorldTileYs = [0, 0, 0]

/** Returns the saved three-bit discovery mask for one Free Roam theme. */
function freeRoamMapActivityDiscoveredMask(theme: FreeRoamTheme) {
    if (theme == FreeRoamTheme.Highway) {
        return highwayMapActivityDiscoveredMask
    } else if (theme == FreeRoamTheme.Cave) {
        return caveMapActivityDiscoveredMask
    }
    return forestMapActivityDiscoveredMask
}

/** Returns the stored logical world tile for one discovered activity. */
function freeRoamMapActivityWorldTileX(
    theme: FreeRoamTheme,
    activityIndex: number
) {
    if (theme == FreeRoamTheme.Highway) {
        return highwayMapActivityWorldTileXs[activityIndex]
    } else if (theme == FreeRoamTheme.Cave) {
        return caveMapActivityWorldTileXs[activityIndex]
    }
    return forestMapActivityWorldTileXs[activityIndex]
}

function freeRoamMapActivityWorldTileY(
    theme: FreeRoamTheme,
    activityIndex: number
) {
    if (theme == FreeRoamTheme.Highway) {
        return highwayMapActivityWorldTileYs[activityIndex]
    } else if (theme == FreeRoamTheme.Cave) {
        return caveMapActivityWorldTileYs[activityIndex]
    }
    return forestMapActivityWorldTileYs[activityIndex]
}

/** Whether a saved activity still represents something present in the world. */
function freeRoamMapActivityIsAvailable(
    theme: FreeRoamTheme,
    activityIndex: number
) {
    if (activityIndex < 0 || activityIndex >= freeRoamMapActivityCount) {
        return false
    }
    if (theme == FreeRoamTheme.Cave) {
        return (caveStatueCollectedMask & (1 << activityIndex)) == 0
    }
    // Forest racers permit rematches and Highway racers remain landmarks.
    return true
}

/** Theme-specific marker/arrow color used by the generated-world map. */
function freeRoamMapActivityColor(theme: FreeRoamTheme) {
    if (theme == FreeRoamTheme.Highway) {
        return 5
    } else if (theme == FreeRoamTheme.Cave) {
        return 11
    }
    return 7
}

function freeRoamMapActivityLegend(theme: FreeRoamTheme) {
    if (theme == FreeRoamTheme.Highway) {
        return "Y:DRIFT"
    } else if (theme == FreeRoamTheme.Cave) {
        return "P:STATUE"
    }
    return "G:NPC"
}

/**
 * Records an activity when its chunk first enters the generated 3x3 window.
 * Saving both the bit and world coordinate lets map arrows survive unloading
 * and later browser sessions without revealing never-generated activities.
 */
function discoverFreeRoamMapActivity(
    theme: FreeRoamTheme,
    activityIndex: number,
    worldTileX: number,
    worldTileY: number
) {
    if (activityIndex < 0 || activityIndex >= freeRoamMapActivityCount) {
        return
    }

    let activityBit = 1 << activityIndex
    let wasDiscovered =
        (freeRoamMapActivityDiscoveredMask(theme) & activityBit) != 0
    let positionChanged =
        freeRoamMapActivityWorldTileX(theme, activityIndex) != worldTileX ||
        freeRoamMapActivityWorldTileY(theme, activityIndex) != worldTileY

    if (!wasDiscovered || positionChanged) {
        if (theme == FreeRoamTheme.Highway) {
            highwayMapActivityDiscoveredMask |= activityBit
            highwayMapActivityWorldTileXs[activityIndex] = worldTileX
            highwayMapActivityWorldTileYs[activityIndex] = worldTileY
        } else if (theme == FreeRoamTheme.Cave) {
            caveMapActivityDiscoveredMask |= activityBit
            caveMapActivityWorldTileXs[activityIndex] = worldTileX
            caveMapActivityWorldTileYs[activityIndex] = worldTileY
        } else {
            forestMapActivityDiscoveredMask |= activityBit
            forestMapActivityWorldTileXs[activityIndex] = worldTileX
            forestMapActivityWorldTileYs[activityIndex] = worldTileY
        }
        saveGameProgress()
    }
}

/** Restores one theme's sanitized discovery data from the browser save. */
function loadFreeRoamMapActivityDiscoveries(
    theme: FreeRoamTheme,
    discoveredMask: number,
    worldTileXs: number[],
    worldTileYs: number[]
) {
    discoveredMask = Math.floor(discoveredMask) & 7
    if (theme == FreeRoamTheme.Highway) {
        highwayMapActivityDiscoveredMask = discoveredMask
        highwayMapActivityWorldTileXs = worldTileXs
        highwayMapActivityWorldTileYs = worldTileYs
    } else if (theme == FreeRoamTheme.Cave) {
        caveMapActivityDiscoveredMask = discoveredMask
        caveMapActivityWorldTileXs = worldTileXs
        caveMapActivityWorldTileYs = worldTileYs
    } else {
        forestMapActivityDiscoveredMask = discoveredMask
        forestMapActivityWorldTileXs = worldTileXs
        forestMapActivityWorldTileYs = worldTileYs
    }
}

/** Clears all discovered targets for Player Stats' Reset Progress action. */
function resetFreeRoamMapActivityDiscoveries() {
    forestMapActivityDiscoveredMask = 0
    forestMapActivityWorldTileXs = [0, 0, 0]
    forestMapActivityWorldTileYs = [0, 0, 0]
    highwayMapActivityDiscoveredMask = 0
    highwayMapActivityWorldTileXs = [0, 0, 0]
    highwayMapActivityWorldTileYs = [0, 0, 0]
    caveMapActivityDiscoveredMask = 0
    caveMapActivityWorldTileXs = [0, 0, 0]
    caveMapActivityWorldTileYs = [0, 0, 0]
}
