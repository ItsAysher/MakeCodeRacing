let existingGameProgressLoaded = loadGameProgress()
recalculatePlayerStats()

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

/** Introduces a new player and creates the first save with their chosen name. */
function introduceNewPlayer() {
    // Placeholder opening cutscene. Replace this text with the final intro.
    story.printCharacterText("The road to the championship starts in your garage.")
    game.showLongText("Enter your name, racer", DialogLayout.Bottom)
    playerName = game.askForString("Enter your name")

    if (!playerName) {
        playerName = "Racer"
    }

    saveGameProgress()
    savePlayerName()
}

/**
 * Runs the opening cutscene, first Garage visit, and selected driving mode.
 */
function runStartingSequence() {
    story.startCutscene(function () {
        if (existingGameProgressLoaded && playerName.length > 0) {
            story.printCharacterText("Welcome back, " + playerName)
        } else {
            introduceNewPlayer()
        }
        showStartMenu()

        // The first Garage visit happens after both the opening cutscene and
        // start menu. Driving-session results trigger later visits.
        let previousBackground = scene.backgroundImage()
        showGarage()
        scene.setBackgroundImage(previousBackground)
        startSelectedDrivingMode()
    })
}

runStartingSequence()
