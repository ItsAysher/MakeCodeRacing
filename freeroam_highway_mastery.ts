// Highway Free Roam mastery encounters and Drift unlock progression

namespace SpriteKind {
    export let HighwayDriftGate = SpriteKind.create()
    export let HighwayDriftNpc = SpriteKind.create()
}

// These two values are permanent progression. save_system.ts serializes them.
// Each low bit represents one completed loop trial, nearest loop first.
let highwayDriftChallengeMask = 0
let highwayDriftUnlocked = false

let highwayDriftEncounterActive = false
let highwayDriftEncounterSeed = -1
let highwayDriftChallengeAnchorXs: number[] = []
let highwayDriftChallengeAnchorYs: number[] = []
let highwayDriftGateSprites: Sprite[] = []
let highwayDriftNpcSprites: Sprite[] = []
let highwayDriftRenderedSectionX = 1000000000
let highwayDriftRenderedSectionY = 1000000000
let highwayActiveDriftChallenge = -1
let highwayActiveDriftWaypoint = 0
let highwayDriftPlayerWasInsideGate = false
let highwayDriftMessageReadyAt = 0
let highwayDriftNpcNearbyMask = 0
let highwayDriftNpcDialogueOpen = false

let highwayDriftChallengeCount = 3
let highwayDriftUniqueGateCount = 8
let highwayDriftGateAlongRoadHalfThickness = 14
let highwayDriftGateAcrossRoadHalfSpan = 56
let highwayDriftAbandonMarginTiles = freeRoamSectionSize * 2
let highwayDriftNpcAlertDistanceTiles = 6
let highwayDriftNpcRearmDistanceTiles = 8

/** Returns whether one of the three permanent highway trials is complete. */
function highwayDriftChallengeIsComplete(challengeIndex: number) {
    return (highwayDriftChallengeMask & (1 << challengeIndex)) != 0
}

/** Number of loop trials represented by the persistent completion bitmask. */
function highwayCompletedDriftChallengeCount() {
    let completed = 0
    for (let index = 0; index < highwayDriftChallengeCount; index++) {
        if (highwayDriftChallengeIsComplete(index)) {
            completed += 1
        }
    }
    return completed
}

/** Removes only the streamed gate visuals; permanent trial state is retained. */
function destroyHighwayDriftGateSprites() {
    for (let gate of highwayDriftGateSprites) {
        gate.destroy()
    }
    highwayDriftGateSprites = []
}

/** Removes streamed NPC markers without changing any challenge progress. */
function destroyHighwayDriftNpcSprites() {
    for (let npc of highwayDriftNpcSprites) {
        npc.destroy()
    }
    highwayDriftNpcSprites = []
}

/**
 * Uses the same three reserved anchors as the highway generator. Keeping the
 * encounter and terrain selections together guarantees that every challenge
 * has a real loop and that each starting gate is within 200 tiles of home.
 */
function chooseHighwayDriftChallengeLoops() {
    highwayDriftChallengeAnchorXs = []
    highwayDriftChallengeAnchorYs = []

    for (let index = 0;
        index < highwayGuaranteedLoopAnchorXs.length;
        index++) {
        highwayDriftChallengeAnchorXs.push(
            highwayGuaranteedLoopAnchorXs[index]
        )
        highwayDriftChallengeAnchorYs.push(
            highwayGuaranteedLoopAnchorYs[index]
        )
    }
}

/** Macro-section X coordinate for one clockwise loop gate. */
function highwayDriftGateSectionX(
    challengeIndex: number,
    waypoint: number
) {
    let left = highwayDriftChallengeAnchorXs[challengeIndex] *
        highwayRouteLengthSections
    let right = left + highwayRouteLengthSections

    if (waypoint == 0 || waypoint == 5) {
        return left + 1
    } else if (waypoint == 1 || waypoint == 4) {
        return right - 1
    } else if (waypoint == 2 || waypoint == 3) {
        return right
    }
    return left
}

/** Macro-section Y coordinate for one clockwise loop gate. */
function highwayDriftGateSectionY(
    challengeIndex: number,
    waypoint: number
) {
    let top = highwayDriftChallengeAnchorYs[challengeIndex] *
        highwayRouteLengthSections
    let bottom = top + highwayRouteLengthSections

    if (waypoint == 0 || waypoint == 1) {
        return top
    } else if (waypoint == 2 || waypoint == 7) {
        return top + 1
    } else if (waypoint == 4 || waypoint == 5) {
        return bottom
    } else if (waypoint == 3 || waypoint == 6) {
        return bottom - 1
    }
    return top
}

/** Logical center tile of a gate's road section. */
function highwayDriftGateWorldTileX(
    challengeIndex: number,
    waypoint: number
) {
    return highwayDriftGateSectionX(challengeIndex, waypoint) *
        freeRoamSectionSize + 4
}

function highwayDriftGateWorldTileY(
    challengeIndex: number,
    waypoint: number
) {
    return highwayDriftGateSectionY(challengeIndex, waypoint) *
        freeRoamSectionSize + 4
}

/**
 * Logical location of the placeholder racer beside a challenge's start gate.
 * Gate zero always crosses a horizontal road heading east, so the racer sits
 * two tiles before it on the north shoulder and faces into the course.
 */
function highwayDriftNpcWorldTileX(challengeIndex: number) {
    return highwayDriftGateWorldTileX(challengeIndex, 0) - 2
}

function highwayDriftNpcWorldTileY(challengeIndex: number) {
    return highwayDriftGateWorldTileY(challengeIndex, 0) - 4
}

/** Builds a visible B2 placeholder racer for one highway challenge. */
function highwayDriftNpcImage(challengeComplete: boolean) {
    let npcImage = allCarBodyImages[1][CarImageDirection.Right].clone()
    npcImage.replace(10, challengeComplete ? 7 : 8)
    return npcImage
}

/** Minimum gate speed rises modestly across the three loop trials. */
function highwayDriftChallengeMinimumSpeed(challengeIndex: number) {
    return playerMaximumSpeed * (0.45 + challengeIndex * 0.07)
}

/** True when a gate crosses a horizontal section of the loop road. */
function highwayDriftGateIsOnHorizontalRoad(waypoint: number) {
    return waypoint == 0 || waypoint == 1 ||
        waypoint == 4 || waypoint == 5
}

/**
 * Creates a shoulder-to-shoulder gate from the existing native cone asset.
 * Horizontal-road gates are vertical bars and vertical-road gates horizontal.
 */
function highwayDriftGateImage(
    challengeComplete: boolean,
    gateActive: boolean,
    horizontalRoad: boolean
) {
    let markerColor = 4
    if (challengeComplete) {
        markerColor = 7
    } else if (gateActive) {
        markerColor = 5
    }

    let firstCone = assets.tile`highwayCone`.clone()
    let secondCone = assets.tile`highwayCone`.clone()
    if (markerColor != 4) {
        firstCone.replace(4, markerColor)
        secondCone.replace(4, markerColor)
    }

    let gateImage: Image = null
    if (horizontalRoad) {
        gateImage = image.create(16, 128)
        gateImage.drawTransparentImage(firstCone, 0, 0)
        gateImage.drawTransparentImage(secondCone, 0, 112)
        gateImage.drawLine(7, 16, 7, 111, markerColor)
        gateImage.drawLine(8, 16, 8, 111, markerColor)
    } else {
        gateImage = image.create(128, 16)
        gateImage.drawTransparentImage(firstCone, 0, 0)
        gateImage.drawTransparentImage(secondCone, 112, 0)
        gateImage.drawLine(16, 7, 111, 7, markerColor)
        gateImage.drawLine(16, 8, 111, 8, markerColor)
    }
    return gateImage
}

/** Whether one logical tile lies inside the current rolling 3x3 window. */
function highwayDriftTileIsInWindow(worldTileX: number, worldTileY: number) {
    let left = highwayFreeRoamWindowWorldTileLeft()
    let top = highwayFreeRoamWindowWorldTileTop()
    return worldTileX >= left && worldTileX < left + freeRoamWindowTileSize &&
        worldTileY >= top && worldTileY < top + freeRoamWindowTileSize
}

/** Converts one logical highway tile into its current rolling-window pixel. */
function highwayDriftWindowPixelX(worldTileX: number) {
    return (worldTileX - highwayFreeRoamWindowWorldTileLeft()) *
        freeRoamTileSize + 8
}

function highwayDriftWindowPixelY(worldTileY: number) {
    return (worldTileY - highwayFreeRoamWindowWorldTileTop()) *
        freeRoamTileSize + 8
}

/** Which waypoint should be highlighted for the requested challenge. */
function highwayDriftDisplayedWaypoint(challengeIndex: number) {
    if (challengeIndex != highwayActiveDriftChallenge) {
        return 0
    }
    // Waypoint 8 is the return crossing of the starting gate.
    return highwayActiveDriftWaypoint == highwayDriftUniqueGateCount ?
        0 : highwayActiveDriftWaypoint
}

/** Recreates only gate sprites that fall inside the currently streamed map. */
function rebuildHighwayDriftGateSprites() {
    destroyHighwayDriftGateSprites()
    destroyHighwayDriftNpcSprites()
    highwayDriftRenderedSectionX = highwayFreeRoamCenterWorldSectionX()
    highwayDriftRenderedSectionY = highwayFreeRoamCenterWorldSectionY()

    for (let challenge = 0;
        challenge < highwayDriftChallengeAnchorXs.length;
        challenge++) {
        let challengeComplete = highwayDriftChallengeIsComplete(challenge)
        let displayedWaypoint = highwayDriftDisplayedWaypoint(challenge)
        let npcWorldTileX = highwayDriftNpcWorldTileX(challenge)
        let npcWorldTileY = highwayDriftNpcWorldTileY(challenge)

        if (highwayDriftTileIsInWindow(
            npcWorldTileX, npcWorldTileY
        )) {
            discoverFreeRoamMapActivity(
                FreeRoamTheme.Highway,
                challenge,
                npcWorldTileX,
                npcWorldTileY
            )
            let npc = sprites.create(
                highwayDriftNpcImage(challengeComplete),
                SpriteKind.HighwayDriftNpc
            )
            npc.setFlag(SpriteFlag.GhostThroughWalls, true)
            npc.setPosition(
                highwayDriftWindowPixelX(npcWorldTileX),
                highwayDriftWindowPixelY(npcWorldTileY)
            )
            npc.z = 15
            npc.data.challenge = challenge
            highwayDriftNpcSprites.push(npc)
        }

        for (let waypoint = 0;
            waypoint < highwayDriftUniqueGateCount;
            waypoint++) {
            let worldTileX = highwayDriftGateWorldTileX(challenge, waypoint)
            let worldTileY = highwayDriftGateWorldTileY(challenge, waypoint)
            let horizontalRoad = highwayDriftGateIsOnHorizontalRoad(waypoint)
            if (!highwayDriftTileIsInWindow(worldTileX, worldTileY)) {
                continue
            }

            let gate = sprites.create(
                highwayDriftGateImage(
                    challengeComplete,
                    !challengeComplete && waypoint == displayedWaypoint,
                    horizontalRoad
                ),
                SpriteKind.HighwayDriftGate
            )
            gate.setFlag(SpriteFlag.Ghost, true)
            let gatePixelX = highwayDriftWindowPixelX(worldTileX)
            let gatePixelY = highwayDriftWindowPixelY(worldTileY)
            // An eight-tile road has its geometric center between tiles 3 and
            // 4. The logical waypoint uses tile 4, so shift the gate half a
            // tile across the road to center its cones on shoulder tiles 0/7.
            if (horizontalRoad) {
                gatePixelY -= freeRoamTileSize / 2
            } else {
                gatePixelX -= freeRoamTileSize / 2
            }
            gate.setPosition(gatePixelX, gatePixelY)
            gate.z = 14
            gate.data.challenge = challenge
            gate.data.waypoint = waypoint
            highwayDriftGateSprites.push(gate)
        }
    }
}

/** Begins tracking a newly entered highway generation session. */
function startHighwayDriftEncounter() {
    highwayDriftEncounterActive = true
    highwayDriftEncounterSeed = highwayFreeRoamSeed
    highwayActiveDriftChallenge = -1
    highwayActiveDriftWaypoint = 0
    highwayDriftPlayerWasInsideGate = false
    highwayDriftNpcNearbyMask = 0
    highwayDriftNpcDialogueOpen = false
    chooseHighwayDriftChallengeLoops()
    rebuildHighwayDriftGateSprites()
}

/** Stops transient trial state without changing saved completion. */
function stopHighwayDriftEncounter() {
    highwayDriftEncounterActive = false
    highwayActiveDriftChallenge = -1
    highwayActiveDriftWaypoint = 0
    highwayDriftPlayerWasInsideGate = false
    highwayDriftNpcNearbyMask = 0
    highwayDriftNpcDialogueOpen = false
    destroyHighwayDriftGateSprites()
    destroyHighwayDriftNpcSprites()
}

/**
 * Opens one NPC introduction per approach, with a larger exit radius so minor
 * steering near the boundary cannot repeatedly reopen the blocking dialogue.
 */
function updateHighwayDriftNpcDialogue() {
    let playerWorldTileX = highwayFreeRoamPlayerWorldTileX()
    let playerWorldTileY = highwayFreeRoamPlayerWorldTileY()
    let showedDialogueThisUpdate = false

    for (let challenge = 0;
        challenge < highwayDriftChallengeAnchorXs.length;
        challenge++) {
        let challengeBit = 1 << challenge
        let offsetX = Math.abs(
            playerWorldTileX - highwayDriftNpcWorldTileX(challenge)
        )
        let offsetY = Math.abs(
            playerWorldTileY - highwayDriftNpcWorldTileY(challenge)
        )
        let npcWasNearby = (highwayDriftNpcNearbyMask & challengeBit) != 0

        if (offsetX <= highwayDriftNpcAlertDistanceTiles &&
            offsetY <= highwayDriftNpcAlertDistanceTiles) {
            if (!npcWasNearby) {
                highwayDriftNpcNearbyMask |= challengeBit

                if (!showedDialogueThisUpdate &&
                    !highwayDriftNpcDialogueOpen &&
                    highwayActiveDriftChallenge < 0 &&
                    !highwayDriftChallengeIsComplete(challenge)) {
                    showedDialogueThisUpdate = true
                    highwayDriftNpcDialogueOpen = true
                    player.vx = 0
                    player.vy = 0
                    game.showLongText(
                        "Drift Racer: The yellow gate beside me starts Drift Challenge " +
                        (challenge + 1) +
                        ". Cross it at speed, then follow each highlighted gate around the loop.",
                        DialogLayout.Bottom
                    )
                    highwayDriftNpcDialogueOpen = false
                }
            }
        } else if (npcWasNearby &&
            (offsetX > highwayDriftNpcRearmDistanceTiles ||
                offsetY > highwayDriftNpcRearmDistanceTiles)) {
            highwayDriftNpcNearbyMask &= ~challengeBit
        }
    }
}

/** Shows a short car-attached message without pausing the driving session. */
function showHighwayDriftMessage(message: string, duration: number) {
    if (playerCarVisual) {
        playerCarVisual.sayText(message, duration, false, 1, 15)
    }
}

/** Commits one completed loop trial and unlocks Drift after all three. */
function completeHighwayDriftChallenge(challengeIndex: number) {
    highwayDriftChallengeMask |= 1 << challengeIndex
    highwayActiveDriftChallenge = -1
    highwayActiveDriftWaypoint = 0
    highwayDriftPlayerWasInsideGate = true

    let completed = highwayCompletedDriftChallengeCount()
    if (completed >= highwayDriftChallengeCount) {
        highwayDriftUnlocked = true
        showHighwayDriftMessage("DRIFT UNLOCKED - HOLD L", 2500)
    } else {
        showHighwayDriftMessage(
            "DRIFT TRIAL " + completed + "/" + highwayDriftChallengeCount,
            1800
        )
    }

    // The shared save routine includes the mask and unlock flag after
    // freeroam mastery persistence is integrated.
    saveGameProgress()
    rebuildHighwayDriftGateSprites()
}

/** Releases the active course so another trial can be started immediately. */
function cancelHighwayDriftChallenge(message: string) {
    highwayActiveDriftChallenge = -1
    highwayActiveDriftWaypoint = 0
    highwayDriftPlayerWasInsideGate = false
    showHighwayDriftMessage(message, 1000)
    rebuildHighwayDriftGateSprites()
}

/** Cancels an abandoned trial after the player drives well beyond its loop. */
function updateHighwayDriftTrialAbandonment() {
    if (highwayActiveDriftChallenge < 0) {
        return
    }

    let challenge = highwayActiveDriftChallenge
    let leftSection = highwayDriftChallengeAnchorXs[challenge] *
        highwayRouteLengthSections
    let topSection = highwayDriftChallengeAnchorYs[challenge] *
        highwayRouteLengthSections
    let rightSection = leftSection + highwayRouteLengthSections
    let bottomSection = topSection + highwayRouteLengthSections
    let leftTile = leftSection * freeRoamSectionSize -
        highwayDriftAbandonMarginTiles
    let topTile = topSection * freeRoamSectionSize -
        highwayDriftAbandonMarginTiles
    let rightTile = (rightSection + 1) * freeRoamSectionSize - 1 +
        highwayDriftAbandonMarginTiles
    let bottomTile = (bottomSection + 1) * freeRoamSectionSize - 1 +
        highwayDriftAbandonMarginTiles
    let playerWorldTileX = highwayFreeRoamPlayerWorldTileX()
    let playerWorldTileY = highwayFreeRoamPlayerWorldTileY()

    if (playerWorldTileX < leftTile || playerWorldTileX > rightTile ||
        playerWorldTileY < topTile || playerWorldTileY > bottomTile) {
        cancelHighwayDriftChallenge("LOOP TRIAL CANCELLED")
    }
}

/** Starts, advances, fails, or completes the current loop gate sequence. */
function crossHighwayDriftGate(challengeIndex: number, waypoint: number) {
    if (highwayDriftChallengeIsComplete(challengeIndex)) {
        return
    }

    let speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy)
    let requiredSpeed = highwayDriftChallengeMinimumSpeed(challengeIndex)

    if (highwayActiveDriftChallenge < 0) {
        if (waypoint != 0) {
            return
        }
        if (speed < requiredSpeed) {
            if (game.runtime() >= highwayDriftMessageReadyAt) {
                showHighwayDriftMessage("ENTER FASTER", 700)
                highwayDriftMessageReadyAt = game.runtime() + 1200
            }
            return
        }

        highwayActiveDriftChallenge = challengeIndex
        highwayActiveDriftWaypoint = 1
        highwayDriftPlayerWasInsideGate = true
        showHighwayDriftMessage("LOOP TRIAL START", 900)
        rebuildHighwayDriftGateSprites()
        return
    }

    if (challengeIndex != highwayActiveDriftChallenge) {
        return
    }

    let expectedWaypoint = highwayActiveDriftWaypoint
    let expectedUniqueWaypoint = expectedWaypoint == highwayDriftUniqueGateCount ?
        0 : expectedWaypoint

    // Returning to the start early is an intentional, immediate cancel. The
    // same gate completes the trial only after all eight waypoints were passed.
    if (waypoint == 0 && expectedWaypoint < highwayDriftUniqueGateCount) {
        cancelHighwayDriftChallenge("LOOP TRIAL CANCELLED")
        return
    }
    if (waypoint != expectedUniqueWaypoint) {
        return
    }

    if (speed < requiredSpeed) {
        highwayActiveDriftChallenge = -1
        highwayActiveDriftWaypoint = 0
        highwayDriftPlayerWasInsideGate = true
        showHighwayDriftMessage("TOO SLOW - TRIAL RESET", 1200)
        rebuildHighwayDriftGateSprites()
        return
    }

    if (expectedWaypoint == highwayDriftUniqueGateCount) {
        completeHighwayDriftChallenge(challengeIndex)
    } else {
        highwayActiveDriftWaypoint += 1
        highwayDriftPlayerWasInsideGate = true
        rebuildHighwayDriftGateSprites()
    }
}

/** Detects a crossing of the next valid gate without retriggering while parked. */
function updateHighwayDriftGateProgress() {
    let playerInsideGate = false

    for (let gate of highwayDriftGateSprites) {
        let challenge: number = gate.data.challenge
        let waypoint: number = gate.data.waypoint
        let gateCanTrigger = false

        if (highwayActiveDriftChallenge < 0) {
            gateCanTrigger = waypoint == 0 &&
                !highwayDriftChallengeIsComplete(challenge)
        } else if (challenge == highwayActiveDriftChallenge) {
            let expectedWaypoint = highwayActiveDriftWaypoint ==
                highwayDriftUniqueGateCount ?
                0 : highwayActiveDriftWaypoint
            gateCanTrigger = waypoint == expectedWaypoint ||
                (waypoint == 0 && highwayActiveDriftWaypoint <
                    highwayDriftUniqueGateCount)
        }

        if (!gateCanTrigger) {
            continue
        }

        let offsetX = Math.abs(gate.x - player.x)
        let offsetY = Math.abs(gate.y - player.y)
        let gateCrossed = false
        if (highwayDriftGateIsOnHorizontalRoad(waypoint)) {
            gateCrossed = offsetX <= highwayDriftGateAlongRoadHalfThickness &&
                offsetY <= highwayDriftGateAcrossRoadHalfSpan
        } else {
            gateCrossed = offsetY <= highwayDriftGateAlongRoadHalfThickness &&
                offsetX <= highwayDriftGateAcrossRoadHalfSpan
        }

        if (gateCrossed) {
            playerInsideGate = true
            if (!highwayDriftPlayerWasInsideGate) {
                crossHighwayDriftGate(challenge, waypoint)
            }
            break
        }
    }

    highwayDriftPlayerWasInsideGate = playerInsideGate
}

game.onUpdate(function () {
    let highwaySessionRunning =
        drivingSessionState == DrivingSessionState.FreeRoam &&
        selectedFreeRoamTheme == FreeRoamTheme.Highway &&
        highwayFreeRoamGenerationIsActive() && player

    if (!highwaySessionRunning) {
        if (highwayDriftEncounterActive) {
            stopHighwayDriftEncounter()
        }
        return
    }

    if (!highwayDriftEncounterActive ||
        highwayDriftEncounterSeed != highwayFreeRoamSeed) {
        startHighwayDriftEncounter()
    } else if (
        highwayDriftRenderedSectionX !=
            highwayFreeRoamCenterWorldSectionX() ||
        highwayDriftRenderedSectionY !=
            highwayFreeRoamCenterWorldSectionY()
    ) {
        rebuildHighwayDriftGateSprites()
    }

    updateHighwayDriftTrialAbandonment()
    updateHighwayDriftNpcDialogue()
    updateHighwayDriftGateProgress()
})
