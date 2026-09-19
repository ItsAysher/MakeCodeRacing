loadRacingSettings()
let existingGameProgressLoaded = loadGameProgress()
recalculatePlayerStats()

/**
 * Blocks the opening sequence until the player starts or reads the instructions.
 */
function showHowToPlay() {
    game.showLongText(
        "DRIVING\nD-pad: throttle + steer\nA: brake / shift to reverse\nMenu: pause or map\nRace through checkpoints in order and protect your durability.",
        DialogLayout.Full
    )
    game.showLongText(
        "FREE ROAM\nB: use selected ability\nMenu: map + ability selector\nFind rival activities to unlock Boost, Blink, and Drift.",
        DialogLayout.Full
    )
    game.showLongText(
        "GARAGE\nWin races for cash. Upgrade acceleration, handling, durability, and braking. Set personal records and earn circuit medals.",
        DialogLayout.Full
    )
}

function showStartMenu() {
    let hasStarted = false

    while (!hasStarted) {
        story.showPlayerChoices(
            "Start Game",
            "How to Play",
            "Settings",
            "About"
        )

        if (story.checkLastAnswer("Start Game")) {
            hasStarted = true
        } else if (story.checkLastAnswer("How to Play")) {
            showHowToPlay()
        } else if (story.checkLastAnswer("Settings")) {
            showRacingSettingsMenu()
        } else {
            game.showLongText(
                "MAKECODE RACING\nVersion " + racingGameVersion +
                "\nProgress: " +
                (existingGameProgressLoaded ? "Save loaded" : "New game"),
                DialogLayout.Full
            )
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
        if (racingSaveCompatibilityWarning) {
            game.showLongText(
                "SAVE PROTECTED\nA save from a newer or incomplete version was found. " +
                    "This session will not overwrite it.",
                DialogLayout.Full
            )
        }
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
