// Player movement and appearance
//
// Car images are stored in this order so the direction indexes remain simple:
// up, down, left, right.
enum CarImageDirection {
    Up,
    Down,
    Left,
    Right
}

// Only the upward image for each body needs to be drawn. The other directions
// are generated once by rotating it, keeping all four views consistent.
let carBody1Up = img`
    . . . . 2 2 2 . . . .
    . . . 2 4 2 4 2 . . .
    . . 2 2 4 2 4 2 2 . .
    . . 2 2 2 2 2 2 2 . .
    . 1 2 2 c c c 2 2 1 .
    . 1 2 2 c c c 2 2 1 .
    . . 2 2 2 2 2 2 2 . .
    . . 2 2 2 2 2 2 2 . .
    . 1 2 2 2 2 2 2 2 1 .
    . 1 2 2 2 2 2 2 2 1 .
    . . . 2 2 2 2 2 . . .
    . . . 2 . . . 2 . . .
`

let carBody2Up = img`
    . . . . 8 8 8 . . . .
    . . . 8 9 8 9 8 . . .
    . . 8 8 9 8 9 8 8 . .
    . 8 8 8 8 8 8 8 8 8 .
    1 8 8 6 6 6 6 6 8 8 1
    1 8 8 6 6 6 6 6 8 8 1
    . 8 8 8 8 8 8 8 8 8 .
    . 8 8 8 8 8 8 8 8 8 .
    1 8 8 8 8 8 8 8 8 8 1
    1 8 8 8 8 8 8 8 8 8 1
    . . 8 8 8 8 8 8 8 . .
    . . 8 8 . . . 8 8 . .
`

let carBody3Up = img`
    . . . . 5 5 5 . . . .
    . . . 5 4 5 4 5 . . .
    . . 5 5 4 5 4 5 5 . .
    . 5 5 5 5 5 5 5 5 5 .
    1 5 5 d d d d d 5 5 1
    1 5 5 d d d d d 5 5 1
    . 5 5 5 5 5 5 5 5 5 .
    . 5 5 5 5 5 5 5 5 5 .
    1 5 5 5 5 5 5 5 5 5 1
    1 5 5 5 5 5 5 5 5 5 1
    . 5 5 5 5 5 5 5 5 5 .
    . 5 5 . . . . . 5 5 .
`

let carBody1Images = [
    carBody1Up,
    carBody1Up.rotated(180),
    carBody1Up.rotated(270),
    carBody1Up.rotated(90)
]
let carBody2Images = [
    carBody2Up,
    carBody2Up.rotated(180),
    carBody2Up.rotated(270),
    carBody2Up.rotated(90)
]
let carBody3Images = [
    carBody3Up,
    carBody3Up.rotated(180),
    carBody3Up.rotated(270),
    carBody3Up.rotated(90)
]

let allCarBodyImages = [
    carBody1Images,
    carBody2Images,
    carBody3Images
]
let activeCarBodyImages = carBody1Images
let currentCarImageDirection = CarImageDirection.Up
let currentCarBodyIndex = -1
let playerMaximumSpeed = 55
let playerReversing = false

// Call this after movement is updated. It picks the equipped body's image set
// and makes the car face its strongest velocity axis.
function updatePlayerCarImage() {
    let bodyIndex = getPartIndex(body, carBodies)
    if (bodyIndex != currentCarBodyIndex) {
        currentCarBodyIndex = bodyIndex
        activeCarBodyImages = allCarBodyImages[bodyIndex]
    }

    // Reversing changes velocity but not the direction the car is facing.
    if (!playerReversing) {
        if (Math.abs(player.vx) > Math.abs(player.vy)) {
            if (player.vx > 1) {
                currentCarImageDirection = CarImageDirection.Right
            } else if (player.vx < -1) {
                currentCarImageDirection = CarImageDirection.Left
            }
        } else {
            if (player.vy > 1) {
                currentCarImageDirection = CarImageDirection.Down
            } else if (player.vy < -1) {
                currentCarImageDirection = CarImageDirection.Up
            }
        }
    }

    player.setImage(activeCarBodyImages[currentCarImageDirection])
}

function playerCarFacingX() {
    if (currentCarImageDirection == CarImageDirection.Right) {
        return 1
    } else if (currentCarImageDirection == CarImageDirection.Left) {
        return -1
    }
    return 0
}

function playerCarFacingY() {
    if (currentCarImageDirection == CarImageDirection.Down) {
        return 1
    } else if (currentCarImageDirection == CarImageDirection.Up) {
        return -1
    }
    return 0
}

function startPlayerMovement() {
    player.vx = 0
    player.vy = 0
    playerReversing = false
    playerMaximumSpeed = Math.max(55, speed * 3)
    updatePlayerCarImage()
}

function stopPlayerMovement() {
    player.vx = 0
    player.vy = 0
    playerReversing = false
}

function updatePlayerMovement() {
    if (!raceInProgress && !freeRoamInProgress) {
        return
    }

    let deltaTime = game.eventContext().deltaTime
    let currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy)

    // A brakes along the current direction of travel.
    if (controller.A.isPressed()) {
        let braking = (40 + brakeSpeed * 2) * deltaTime
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
            let reverseBraking = (40 + brakeSpeed * 2) * deltaTime
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
            let reverseMaximumSpeed = Math.min(40, playerMaximumSpeed * 0.45)
            let reverseAcceleration = 14 + acceleration * 5
            currentSpeed = Math.min(
                reverseMaximumSpeed,
                currentSpeed + reverseAcceleration * deltaTime
            )
            player.vx = inputX * currentSpeed
            player.vy = inputY * currentSpeed
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
        let oppositeBraking = (40 + brakeSpeed * 2) * deltaTime
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
    let turnRate = (4.5 + acceleration * 0.45) * (1 - speedRatio * 0.45)
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
    let driveAcceleration = 24 + acceleration * 8
    currentSpeed = Math.min(
        playerMaximumSpeed,
        Math.max(0, currentSpeed + (driveAcceleration - corneringDrag) * deltaTime)
    )

    player.vx = directionX * currentSpeed
    player.vy = directionY * currentSpeed
}

game.onUpdate(function () {
    updatePlayerMovement()
    updatePlayerCarImage()
})