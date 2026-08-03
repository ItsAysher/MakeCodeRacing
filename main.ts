// Metadata
let cash = 0
let wins = 10
let racesRaced = 0

recalculatePlayerStats()

// Driving modes create and destroy their own player sprite.
let player: Sprite = null

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
