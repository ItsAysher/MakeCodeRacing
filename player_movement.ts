// Player movement and collision

let playerReversing = false

// The authored car is 24 pixels long, but a race lane is only 16 pixels wide.
// This hidden square is the physical car; playerCarVisual draws the full car.
let playerCollisionImage = img`
    1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1 1 1
`

/**
 * Creates the player's hidden hitbox and visible car as one layered pair.
 * @param direction Initial facing direction. Defaults to right.
 */
function createPlayer(direction?: CarImageDirection) {
    playerReversing = false

    player = sprites.create(playerCollisionImage, SpriteKind.Player)
    player.setFlag(SpriteFlag.Invisible, true)
    player.z = 10

    createPlayerRendering(direction)

    return player
}

/** Destroys both halves of the player car. */
function destroyPlayer() {
    destroyPlayerRendering()
    player.destroy()
    player = null
}

/**
 * Resets movement state for an already-created player.
 */
function startPlayerMovement() {
    player.vx = 0
    player.vy = 0
    playerReversing = false
    resetPlayerVehicleSoundTimers()
    updatePlayerCarImage()
}

/**
 * Updates acceleration, braking, reversing, steering, and coasting for one frame.
 * Input changes direction gradually so high-speed turns remain wider than
 * low-speed turns.
 */
function updatePlayerMovement() {
    let deltaTime = game.eventContext().deltaTime
    let currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy)

    // A brakes along the current direction of travel.
    if (controller.A.isPressed()) {
        let braking = playerBrakingDeceleration * deltaTime
        let newSpeed = Math.max(0, currentSpeed - braking)

        if (currentSpeed > 0) {
            player.vx = player.vx * newSpeed / currentSpeed
            player.vy = player.vy * newSpeed / currentSpeed
        }
        return
    }

    let inputX = (controller.right.isPressed() ? 1 : 0) -
        (controller.left.isPressed() ? 1 : 0)
    let inputY = (controller.down.isPressed() ? 1 : 0) -
        (controller.up.isPressed() ? 1 : 0)
    let inputLength = Math.sqrt(inputX * inputX + inputY * inputY)

    if (inputLength == 0) {
        // Coasting drag slows the car without changing its direction.
        let coasting = 9 * deltaTime
        let newSpeed = Math.max(0, currentSpeed - coasting)

        if (currentSpeed > 0) {
            player.vx = player.vx * newSpeed / currentSpeed
            player.vy = player.vy * newSpeed / currentSpeed
        }
        return
    }

    inputX = inputX / inputLength
    inputY = inputY / inputLength

    let facingAlignment = playerCarFacingX() * inputX +
        playerCarFacingY() * inputY
    let shiftSpeed = 6

    if (playerReversing) {
        // Forward input first brakes away the remaining reverse speed, then
        // shifts back into forward movement near a stop.
        if (facingAlignment > 0.5) {
            let reverseBraking = playerBrakingDeceleration * deltaTime
            let newSpeed = Math.max(0, currentSpeed - reverseBraking)

            if (currentSpeed > 0) {
                player.vx = player.vx * newSpeed / currentSpeed
                player.vy = player.vy * newSpeed / currentSpeed
            }

            if (newSpeed <= shiftSpeed) {
                player.vx = 0
                player.vy = 0
                playerReversing = false
            }
            return
        }

        // Reverse throttle is available only behind the car and is capped
        // below forward speed.
        if (facingAlignment < -0.5) {
            currentSpeed = Math.min(
                playerReverseMaximumSpeed,
                currentSpeed + playerReverseAcceleration * deltaTime
            )
            player.vx = inputX * currentSpeed
            player.vy = inputY * currentSpeed
            playPlayerAccelerationSound()
        } else {
            let newSpeed = Math.max(0, currentSpeed - 9 * deltaTime)
            if (currentSpeed > 0) {
                player.vx = player.vx * newSpeed / currentSpeed
                player.vy = player.vy * newSpeed / currentSpeed
            }
        }
        return
    }

    let movementAlignment = facingAlignment
    if (currentSpeed > shiftSpeed) {
        movementAlignment = (player.vx * inputX + player.vy * inputY) / currentSpeed
    }

    // Opposite input behaves like a brake. Reverse engages only near a stop,
    // preventing velocity from instantly flipping direction.
    if (movementAlignment < -0.5) {
        let oppositeBraking = playerBrakingDeceleration * deltaTime
        let newSpeed = Math.max(0, currentSpeed - oppositeBraking)

        if (currentSpeed > 0) {
            player.vx = player.vx * newSpeed / currentSpeed
            player.vy = player.vy * newSpeed / currentSpeed
        }

        if (newSpeed <= shiftSpeed) {
            player.vx = 0
            player.vy = 0
            playerReversing = true
        }
        return
    }

    if (currentSpeed < 0.5) {
        // Give a stopped car a stable initial heading.
        player.vx = inputX
        player.vy = inputY
        currentSpeed = 0
    }

    let directionLength = Math.sqrt(player.vx * player.vx + player.vy * player.vy)
    let directionX = directionLength > 0 ? player.vx / directionLength : inputX
    let directionY = directionLength > 0 ? player.vy / directionLength : inputY
    let speedRatio = Math.min(1, currentSpeed / playerMaximumSpeed)
    let alignment = directionX * inputX + directionY * inputY

    // Blend the current heading toward the requested heading. Acceleration
    // upgrades also improve response, while speed still produces wider turns.
    let turnRate = playerTurnRateAtSpeed(speedRatio)
    let turnBlend = Math.min(1, turnRate * deltaTime)
    directionX = directionX * (1 - turnBlend) + inputX * turnBlend
    directionY = directionY * (1 - turnBlend) + inputY * turnBlend

    directionLength = Math.sqrt(directionX * directionX + directionY * directionY)
    if (directionLength > 0) {
        directionX = directionX / directionLength
        directionY = directionY / directionLength
    }

    // Turning scrubs a little speed, but no longer fights steering by applying
    // acceleration sideways. Reversing direction naturally costs the most.
    let turnSeverity = (1 - alignment) / 2
    let corneringDrag = turnSeverity * (4 + speedRatio * 8)
    currentSpeed = Math.min(
        playerMaximumSpeed,
        Math.max(0, currentSpeed + (playerDriveAcceleration - corneringDrag) * deltaTime)
    )

    player.vx = directionX * currentSpeed
    player.vy = directionY * currentSpeed
    playPlayerTurningSound(turnSeverity, currentSpeed)
    playPlayerAccelerationSound()
}

// Keeps movement physics and the visible car image synchronized every frame.
game.onUpdate(function () {
    if (raceInProgress || freeRoamInProgress) {
        updatePlayerMovement()
        updatePlayerCarImage()
    }
})
