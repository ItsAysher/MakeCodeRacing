// Top-level driving-mode selection and session transitions

enum DrivingMode {
    Race,
    FreeRoam
}

enum DrivingSessionState {
    None,
    Race,
    RaceFinishing,
    FreeRoam
}

let selectedDrivingMode = DrivingMode.Race
let drivingSessionState = DrivingSessionState.None

/** Starts the driving mode selected in the Garage. */
function startSelectedDrivingMode() {
    if (selectedDrivingMode == DrivingMode.FreeRoam) {
        startFreeRoam()
    } else {
        startNextRace()
    }
}

/** Cleans up the active driving session and restores the neutral Garage scene. */
function leaveCurrentDrivingSession() {
    if (drivingSessionState == DrivingSessionState.None) {
        return
    }

    if (drivingSessionState == DrivingSessionState.Race ||
        drivingSessionState == DrivingSessionState.RaceFinishing) {
        stopCurrentRace()
    }

    destroyPlayer()
    drivingSessionState = DrivingSessionState.None
    scene.centerCameraAt(80, 60)
    tiles.setCurrentTilemap(null)
}
