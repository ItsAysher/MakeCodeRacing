// Persistent Cave Free Roam statue encounter and Blink unlock progression

/**
 * Permanent progression. The save system serializes these values through the
 * getters and loader below; the three low bits correspond to stable statue
 * site indices derived from the saved Cave world seed.
 */
let caveStatueCollectedMask = 0
let caveStatuesReturned = 0
let caveCarriedStatueIndex = -1
let caveTeleportUnlocked = false

let caveMasteryActive = false
let caveMasterySeed = -1
let caveMasteryLastCenterSectionX = 0
let caveMasteryLastCenterSectionY = 0
let caveMasterySiteWorldTileX: number[] = []
let caveMasterySiteWorldTileY: number[] = []
let caveMasterySiteSprites: Sprite[] = [null, null, null]
let caveMasteryHomeSprite: Sprite = null
let caveMasteryCarriedSprite: Sprite = null
let caveMasteryFullPedestalImage: Image = null
let caveMasteryEmptyPedestalImage: Image = null
let caveMasteryHomePedestalImage: Image = null
let caveStatueSiteCount = 3

/** Returns the compact three-bit set of Cave statues removed from their sites. */
function caveMasteryCollectedMaskForSave() {
    return caveStatueCollectedMask
}

/** Returns how many carried statues have been delivered to the home altar. */
function caveMasteryReturnedCountForSave() {
    return caveStatuesReturned
}

/** Returns -1 when empty-handed, otherwise the carried stable site index. */
function caveMasteryCarriedStatueForSave() {
    return caveCarriedStatueIndex
}

/** Returns whether depositing all three statues permanently unlocked Blink. */
function caveMasteryTeleportUnlockedForSave() {
    return caveTeleportUnlocked
}

/** Counts set bits without relying on JavaScript-only bit helper functions. */
function caveMasteryCountCollectedStatues(mask: number) {
    let count = 0
    for (let siteIndex = 0; siteIndex < caveStatueSiteCount; siteIndex++) {
        if (mask & (1 << siteIndex)) {
            count++
        }
    }
    return count
}

/**
 * Restores and sanitizes Cave mastery values read by the shared save system.
 * Call this once after the ordinary game progress has been loaded.
 */
function loadCaveMasteryProgress(
    collectedMask: number,
    returnedCount: number,
    carriedStatueIndex: number,
    teleportUnlocked: boolean
) {
    caveStatueCollectedMask = Math.floor(collectedMask) & 7
    caveStatuesReturned = Math.max(
        0,
        Math.min(caveStatueSiteCount, Math.floor(returnedCount))
    )

    caveCarriedStatueIndex = -1
    if (carriedStatueIndex >= 0 &&
        carriedStatueIndex < caveStatueSiteCount &&
        (caveStatueCollectedMask & (1 << carriedStatueIndex))) {
        caveCarriedStatueIndex = Math.floor(carriedStatueIndex)
    }

    // Delivered statues must be a subset of the statues removed from sites.
    let collectedCount = caveMasteryCountCollectedStatues(
        caveStatueCollectedMask
    )
    caveStatuesReturned = Math.min(caveStatuesReturned, collectedCount)
    caveTeleportUnlocked = teleportUnlocked ||
        caveStatuesReturned >= caveStatueSiteCount

    if (caveMasteryActive) {
        caveMasteryRefreshWorldSprites()
        caveMasteryRefreshCarriedSprite()
    }
}

/** Restores new-game defaults; called by Reset Progress integration. */
function resetCaveMasteryProgress() {
    caveStatueCollectedMask = 0
    caveStatuesReturned = 0
    caveCarriedStatueIndex = -1
    caveTeleportUnlocked = false
    resetBlinkAbility()

    if (caveMasteryActive) {
        caveMasteryRefreshWorldSprites()
        caveMasteryRefreshCarriedSprite()
    }
}

/** Builds one cached placeholder from the existing pedestal and B2 car art. */
function caveMasteryBuildDisplayImages() {
    if (caveMasteryFullPedestalImage) {
        return
    }

    let pedestal = sprites.builtin.pedestal
    let stoneCar = carBody2Images[CarImageDirection.Right].clone()

    // The B2 sprite remains recognizable while its bright race paint becomes
    // a neutral stone palette. No additional generated image asset is needed.
    stoneCar.replace(10, 1)
    stoneCar.replace(12, 13)

    let displayWidth = Math.max(pedestal.width, stoneCar.width)
    let displayHeight = pedestal.height + 8
    caveMasteryFullPedestalImage = image.create(
        displayWidth,
        displayHeight
    )
    caveMasteryFullPedestalImage.drawTransparentImage(
        pedestal,
        (displayWidth - pedestal.width) >> 1,
        displayHeight - pedestal.height
    )
    caveMasteryFullPedestalImage.drawTransparentImage(
        stoneCar,
        (displayWidth - stoneCar.width) >> 1,
        0
    )

    caveMasteryEmptyPedestalImage = image.create(
        displayWidth,
        displayHeight
    )
    caveMasteryEmptyPedestalImage.drawTransparentImage(
        pedestal,
        (displayWidth - pedestal.width) >> 1,
        displayHeight - pedestal.height
    )

    let homeMarker = sprites.dungeon.collectibleInsignia
    caveMasteryHomePedestalImage = caveMasteryEmptyPedestalImage.clone()
    caveMasteryHomePedestalImage.drawTransparentImage(
        homeMarker,
        (displayWidth - homeMarker.width) >> 1,
        0
    )
}

/**
 * Selects three distant, guaranteed-floor sites in separate sectors. Their
 * section centers are always part of every generated Cave archetype, so the
 * encounter never depends on a particular random exit combination.
 */
function caveMasteryBuildStatueSites() {
    caveMasterySiteWorldTileX = []
    caveMasterySiteWorldTileY = []

    for (let siteIndex = 0;
        siteIndex < caveStatueSiteCount;
        siteIndex++) {
        let distance = 5 + freeRoamCoordinateHash(
            caveFreeRoamSeed,
            siteIndex,
            0,
            701
        ) % 4
        let sectionX = 0
        let sectionY = 0

        // Both coordinate axes are guaranteed connected backbones in the Cave
        // topology. East, west, and one seeded vertical branch therefore keep
        // all three sites reachable for every seed, not merely on a floor tile.
        if (siteIndex == 0) {
            sectionX = distance
        } else if (siteIndex == 1) {
            sectionX = -distance
        } else {
            let usesSouthBranch = freeRoamCoordinateHash(
                caveFreeRoamSeed,
                siteIndex,
                0,
                719
            ) % 2 == 0
            sectionY = usesSouthBranch ? distance : -distance
        }

        let localColumn = 3 + freeRoamCoordinateHash(
            caveFreeRoamSeed,
            sectionX,
            sectionY,
            733
        ) % 2
        let localRow = 3 + freeRoamCoordinateHash(
            caveFreeRoamSeed,
            sectionX,
            sectionY,
            751
        ) % 2

        caveMasterySiteWorldTileX.push(
            sectionX * freeRoamSectionSize + localColumn
        )
        caveMasterySiteWorldTileY.push(
            sectionY * freeRoamSectionSize + localRow
        )
    }
}

/** Logical world tile to physical streaming-window tile conversion. */
function caveMasteryPhysicalTileX(worldTileX: number) {
    return worldTileX -
        caveFreeRoamCenterWorldSectionX() * freeRoamSectionSize +
        freeRoamSectionSize
}

function caveMasteryPhysicalTileY(worldTileY: number) {
    return worldTileY -
        caveFreeRoamCenterWorldSectionY() * freeRoamSectionSize +
        freeRoamSectionSize
}

/** Places a non-colliding encounter sprite when its logical tile is loaded. */
function caveMasteryCreateWorldSprite(
    displayImage: Image,
    worldTileX: number,
    worldTileY: number
) {
    let physicalTileX = caveMasteryPhysicalTileX(worldTileX)
    let physicalTileY = caveMasteryPhysicalTileY(worldTileY)
    if (physicalTileX < 0 || physicalTileX >= freeRoamWindowTileSize ||
        physicalTileY < 0 || physicalTileY >= freeRoamWindowTileSize) {
        return null
    }

    let displaySprite = sprites.create(displayImage, SpriteKind.Food)
    displaySprite.setFlag(SpriteFlag.Ghost, true)
    displaySprite.z = 7
    displaySprite.setPosition(
        physicalTileX * freeRoamTileSize + freeRoamTileSize / 2,
        physicalTileY * freeRoamTileSize + freeRoamTileSize / 2
    )
    return displaySprite
}

/** Removes only sprites owned by this encounter module. */
function caveMasteryDestroyWorldSprites() {
    for (let siteIndex = 0;
        siteIndex < caveMasterySiteSprites.length;
        siteIndex++) {
        if (caveMasterySiteSprites[siteIndex]) {
            caveMasterySiteSprites[siteIndex].destroy()
            caveMasterySiteSprites[siteIndex] = null
        }
    }

    if (caveMasteryHomeSprite) {
        caveMasteryHomeSprite.destroy()
        caveMasteryHomeSprite = null
    }
}

/** Recreates pedestals after the 3x3 tile window moves to new world sections. */
function caveMasteryRefreshWorldSprites() {
    caveMasteryDestroyWorldSprites()

    for (let siteIndex = 0;
        siteIndex < caveStatueSiteCount;
        siteIndex++) {
        let statueWasCollected =
            (caveStatueCollectedMask & (1 << siteIndex)) != 0
        caveMasterySiteSprites[siteIndex] = caveMasteryCreateWorldSprite(
            statueWasCollected ?
                caveMasteryEmptyPedestalImage :
                caveMasteryFullPedestalImage,
            caveMasterySiteWorldTileX[siteIndex],
            caveMasterySiteWorldTileY[siteIndex]
        )
        if (!statueWasCollected && caveMasterySiteSprites[siteIndex]) {
            discoverFreeRoamMapActivity(
                FreeRoamTheme.Cave,
                siteIndex,
                caveMasterySiteWorldTileX[siteIndex],
                caveMasterySiteWorldTileY[siteIndex]
            )
        }
    }

    caveMasteryHomeSprite = caveMasteryCreateWorldSprite(
        caveMasteryHomePedestalImage,
        caveFreeRoamHomeWorldTileX(),
        caveFreeRoamHomeWorldTileY()
    )
}

/** Creates or removes the small stone car displayed above a carrying player. */
function caveMasteryRefreshCarriedSprite() {
    if (caveMasteryCarriedSprite) {
        caveMasteryCarriedSprite.destroy()
        caveMasteryCarriedSprite = null
    }

    if (caveCarriedStatueIndex >= 0 && caveMasteryActive) {
        let carriedImage = carBody2Images[CarImageDirection.Right].clone()
        carriedImage.replace(10, 1)
        carriedImage.replace(12, 13)
        caveMasteryCarriedSprite = sprites.create(
            carriedImage,
            SpriteKind.Food
        )
        caveMasteryCarriedSprite.setFlag(SpriteFlag.Ghost, true)
        caveMasteryCarriedSprite.z = 13
    }
}

/** Starts the transient presentation for the current persistent Cave world. */
function startCaveMasterySession() {
    caveMasteryBuildDisplayImages()
    caveMasteryBuildStatueSites()
    caveMasterySeed = caveFreeRoamSeed
    caveMasteryLastCenterSectionX = caveFreeRoamCenterWorldSectionX()
    caveMasteryLastCenterSectionY = caveFreeRoamCenterWorldSectionY()
    caveMasteryActive = true
    caveMasteryRefreshWorldSprites()
    caveMasteryRefreshCarriedSprite()

    if (!caveTeleportUnlocked && playerCarVisual) {
        playerCarVisual.sayText("FIND 3 STONE RACERS", 2500, false)
    }
}

/** Stops rendering encounter objects without changing permanent progress. */
function stopCaveMasterySession() {
    caveMasteryActive = false
    caveMasteryDestroyWorldSprites()
    if (caveMasteryCarriedSprite) {
        caveMasteryCarriedSprite.destroy()
        caveMasteryCarriedSprite = null
    }
}

/** Picks up one site statue, leaving its persistent empty pedestal behind. */
function caveMasteryCollectStatue(siteIndex: number) {
    if (caveCarriedStatueIndex >= 0 ||
        (caveStatueCollectedMask & (1 << siteIndex))) {
        return
    }

    caveStatueCollectedMask |= 1 << siteIndex
    caveCarriedStatueIndex = siteIndex
    caveMasteryRefreshWorldSprites()
    caveMasteryRefreshCarriedSprite()
    saveGameProgress()

    if (playerCarVisual) {
        playerCarVisual.sayText("RETURN THIS STATUE HOME", 2200, false)
    }
}

/** Deposits the carried statue and unlocks Blink after the third delivery. */
function caveMasteryDepositCarriedStatue() {
    if (caveCarriedStatueIndex < 0) {
        return
    }

    caveCarriedStatueIndex = -1
    caveStatuesReturned = Math.min(
        caveStatueSiteCount,
        caveStatuesReturned + 1
    )
    caveMasteryRefreshCarriedSprite()

    let unlockedNow = false
    if (caveStatuesReturned >= caveStatueSiteCount &&
        !caveTeleportUnlocked) {
        caveTeleportUnlocked = true
        unlockedNow = true
    }
    saveGameProgress()

    if (unlockedNow) {
        game.showLongText(
            "Blink unlocked! Press K in any Free Roam to teleport up to 5 tiles across open ground.",
            DialogLayout.Bottom
        )
    } else if (playerCarVisual) {
        playerCarVisual.sayText(
            "STATUES RETURNED " + caveStatuesReturned + "/3",
            2000,
            false
        )
    }
}

/** Keeps a carried statue attached and handles automatic pickup/deposit zones. */
function updateCaveMasteryEncounter() {
    let centerSectionX = caveFreeRoamCenterWorldSectionX()
    let centerSectionY = caveFreeRoamCenterWorldSectionY()
    if (centerSectionX != caveMasteryLastCenterSectionX ||
        centerSectionY != caveMasteryLastCenterSectionY) {
        caveMasteryLastCenterSectionX = centerSectionX
        caveMasteryLastCenterSectionY = centerSectionY
        caveMasteryRefreshWorldSprites()
    }

    if (caveMasteryCarriedSprite) {
        caveMasteryCarriedSprite.setPosition(player.x, player.y - 16)
    }

    if (caveCarriedStatueIndex >= 0 && caveMasteryHomeSprite &&
        Math.abs(player.x - caveMasteryHomeSprite.x) <= 22 &&
        Math.abs(player.y - caveMasteryHomeSprite.y) <= 22) {
        caveMasteryDepositCarriedStatue()
        return
    }

    if (caveCarriedStatueIndex >= 0) {
        return
    }

    for (let siteIndex = 0;
        siteIndex < caveStatueSiteCount;
        siteIndex++) {
        let siteSprite = caveMasterySiteSprites[siteIndex]
        if (siteSprite &&
            !(caveStatueCollectedMask & (1 << siteIndex)) &&
            Math.abs(player.x - siteSprite.x) <= 18 &&
            Math.abs(player.y - siteSprite.y) <= 18) {
            caveMasteryCollectStatue(siteIndex)
            return
        }
    }
}

/** Automatically follows Cave session startup, shutdown, and window rebases. */
game.onUpdate(function () {
    let shouldBeActive =
        drivingSessionState == DrivingSessionState.FreeRoam &&
        selectedFreeRoamTheme == FreeRoamTheme.Cave &&
        caveFreeRoamGenerationIsActive() &&
        player != null

    if (shouldBeActive &&
        (!caveMasteryActive || caveMasterySeed != caveFreeRoamSeed)) {
        if (caveMasteryActive) {
            stopCaveMasterySession()
        }
        startCaveMasterySession()
    } else if (!shouldBeActive && caveMasteryActive) {
        stopCaveMasterySession()
    }

    if (caveMasteryActive) {
        updateCaveMasteryEncounter()
    }
})
