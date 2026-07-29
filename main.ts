// Metadata
let cash = 0
let wins = 10
let racesRaced = 0

recalculatePlayerStats()

let player = sprites.create(img`
    . . . . . . . . . . . . . . . .
    . . . . 2 2 2 2 2 2 2 2 . . . .
    . . . 2 4 2 2 2 2 2 2 c 2 . . .
    . . 2 c 4 2 2 2 2 2 2 c c 2 . .
    . 2 c c 4 4 4 4 4 4 2 c c 4 2 d
    . 2 c 2 e e e e e e e b c 4 2 2
    . 2 2 e b b e b b b e e b 4 2 2
    . 2 e b b b e b b b b e 2 2 2 2
    . e e 2 2 2 e 2 2 2 2 2 e 2 2 2
    . e e e e e e f e e e f e 2 d d
    . e e e e e e f e e f e e e 2 d
    . e e e e e e f f f e e e e e e
    . e f f f f e e e e f f f e e e
    . . f f f f f e e f f f f f e .
    . . . f f f . . . . f f f f . .
    . . . . . . . . . . . . . . . .
`, SpriteKind.Player)

/**
 * Blocks the opening sequence until the player starts or reads the instructions.
 */
function showStartMenu() {
    let hasStarted = false

    while (!hasStarted) {
        story.showPlayerChoices("Start Game", "How to Play")

        if (story.checkLastAnswer("Start Game")) {
            hasStarted = true
        } else {
            game.showLongText("Choose car parts in the Garage, then race to earn cash and wins.", DialogLayout.Bottom)
        }
    }
}

/**
 * Runs the opening cutscene, first Garage visit, and selected driving mode.
 */
function runStartingSequence() {
    story.startCutscene(function () {
        // Placeholder opening cutscene. Replace this text with the final intro.
        story.printCharacterText("The road to the championship starts in your garage.")
        showStartMenu()

        // The first Garage visit happens after both the opening cutscene and
        // start menu. Later visits are triggered by finishRace.
        let previousBackground = scene.backgroundImage()
        showGarage()
        scene.setBackgroundImage(previousBackground)
        startSelectedDrivingMode()
    })
}

runStartingSequence()
