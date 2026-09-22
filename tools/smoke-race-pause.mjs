// Controller-only actions plus read-only simulator observations. No injected
// game hooks, teleports, timer edits, save seeding, or hardware code overhead.
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

export async function runRacePauseChecks(api) {
    const { evaluate, pressController: press, waitUntil, sleep } = api
    const samples = []
    let screenshotCount = 0

    async function state() {
        return evaluate(`(() => {
            const globals = document.querySelector('#simframe').contentWindow.pxsim.runtime.globals
            function get(name) {
                const keys = Object.keys(globals).filter(key => key.startsWith(name + '___'))
                if (keys.length !== 1) throw new Error('Missing/ambiguous simulator global: ' + name)
                return globals[keys[0]]
            }
            function sprite(value) {
                if (!value) return null
                const fields = value.fields
                if (!fields || !('_x' in fields) || !('_y' in fields)) {
                    throw new Error('Unsupported simulator sprite representation')
                }
                return { id: value.id, x: fields._x, y: fields._y,
                    vx: fields._vx, vy: fields._vy }
            }
            const racers = get('aiRacers')
            if (!Array.isArray(racers.data)) throw new Error('Unsupported simulator array representation')
            return {
                session: get('raceSessionId'), driving: get('drivingSessionState'),
                paused: get('racePauseMenuOpen'), page: get('racePauseMenuPage'),
                selection: get('racePauseMenuSelection'),
                settingsPage: get('racePauseSettingsPage'),
                settingsSelection: get('racePauseSettingsSelection'),
                confirmSelection: get('racePauseConfirmSelection'),
                elapsed: get('currentRaceElapsedMilliseconds'),
                lapElapsed: get('currentLapElapsedMilliseconds'),
                timing: get('currentRaceTimingActive'), lap: get('raceLap'),
                gates: get('playerRaceRouteGatesPassed'), gate: get('playerRaceRouteGateIndex'),
                health: get('playerRaceHealth'), maxHealth: get('playerMaximumDurability'),
                player: sprite(get('player')), racers: racers.data.map(sprite),
                countdownVisible: get('raceCountdownSprite') != null,
                hasRace: get('activeRaceDefinition') != null,
                layout: get('selectedRaceLayout')
            }
        })()`)
    }

    async function expect(predicate, label) {
        let value
        await waitUntil(async () => {
            value = await state()
            return predicate(value)
        }, api.timeout, label)
        samples.push({ label, state: value })
        return value
    }

    async function screenshot(label) {
        const capture = await api.waitForStableCanvas()
        const name = `pause-${String(++screenshotCount).padStart(2, "0")}-${label}.png`
        fs.writeFileSync(path.join(api.artifacts, name), capture.png)
        console.log(`  ${name}`)
        return capture.hash
    }

    // Values correspond to DrivingSessionState and RacePauseMenuPage. Read
    // them rather than editing them; navigation is always physical key input.
    async function select(index) {
        const before = await state()
        assert.equal(before.paused, true, "Pause action attempted while racing")
        const settings = before.page === 2
        const confirmation = before.page === 3 || before.page === 4
        const count = settings ? 4 : confirmation ? 2 : 5
        const selected = settings ? before.settingsSelection :
            confirmation ? before.confirmSelection : before.selection
        assert.ok(index >= 0 && index < count)
        for (let i = 0; i < (index - selected + count) % count; i++) await press("Down")
        await press("A")
    }

    function frozenFields(value) {
        return { session: value.session, driving: value.driving,
            elapsed: value.elapsed, lapElapsed: value.lapElapsed, lap: value.lap,
            gates: value.gates, gate: value.gate, health: value.health,
            player: value.player, racers: value.racers }
    }

    async function assertFrozen(label, duration) {
        const before = await state()
        assert.equal(before.paused, true)
        assert.equal(before.countdownVisible, false, "Countdown banner survived the race scene switch")
        await sleep(duration)
        const after = await state()
        assert.deepEqual(frozenFields(after), frozenFields(before), `${label}: race advanced while paused`)
        samples.push({ label, duration, state: after })
    }

    try {
        const intro = await expect(s => s.driving === 1 && !s.paused, "Reverse race intro")
        assert.equal(intro.layout, 1, "Pause suite must retain the selected reverse layout")
        await press("A")
        await press("Menu")
        const grid = await expect(s => s.paused && s.driving === 1, "Pause during grid countdown")
        const pauseHash = await screenshot("grid")
        // Longer than the entire original countdown: catches stale GO fibers.
        await assertFrozen("Grid countdown cancellation", 2400)
        await select(0)
        await expect(s => !s.paused && s.driving === 1, "Resume starts a fresh countdown")
        await sleep(500)
        assert.equal((await state()).driving, 1, "Grid resumed without its fresh countdown")
        const live = await expect(s => s.driving === 2 && s.timing, "Countdown releases race")
        assert.equal(live.session, grid.session)
        assert.ok(live.elapsed < 800, "Paused grid time leaked into the race clock")
        await press("Left", 650)
        const moving = await state()
        assert.notEqual(moving.player.x, live.player.x, "Controller input did not move the racer")
        await press("Menu")
        const paused = await expect(s => s.paused && s.driving === 2, "Pause a moving live race")
        assert.ok(paused.elapsed > 500)
        assert.equal(await screenshot("live"), pauseHash, "Grid and live pause panels differ")
        await assertFrozen("Live timer, lap, health, player and AI", 1400)

        await select(2)
        await expect(s => s.page === 1, "Controls opens from pause")
        await screenshot("controls")
        await press("B")
        await select(3)
        for (let page = 0; page < 4; page++) {
            await expect(s => s.page === 2 && s.settingsPage === page, `Pause settings page ${page + 1}`)
            await screenshot(`settings-${page + 1}`)
            await select(2)
        }
        await expect(s => s.settingsPage === 0, "Settings More wraps to page one")
        await select(3)
        await expect(s => s.page === 0, "Settings Back returns to pause actions")
        assert.deepEqual(frozenFields(await state()), frozenFields(paused), "Pause submenus advanced the race")

        await select(1)
        await expect(s => s.page === 3 && s.confirmSelection === 1, "Restart defaults to Cancel")
        await screenshot("restart-confirmation")
        await press("A")
        await expect(s => s.page === 0 && s.session === paused.session, "Cancel preserves the current race")
        await press("B")
        await expect(s => !s.paused && s.elapsed > paused.elapsed, "B resumes the live race clock")
        await press("Menu")
        await expect(s => s.paused, "Reopen pause after resume")
        const beforeRestart = await state()
        await select(1)
        await select(0)
        const restarted = await expect(s => !s.paused && s.driving === 1 &&
            s.session > beforeRestart.session, "Confirmed restart creates a new grid")
        assert.equal(restarted.layout, 1)
        assert.equal(restarted.lap, 0)
        assert.equal(restarted.gates, 0)
        assert.equal(restarted.gate, 0)
        assert.equal(restarted.health, restarted.maxHealth)
        assert.equal(restarted.racers.length, intro.racers.length, "Restart duplicated or lost rivals")
        assert.equal(restarted.player.x, intro.player.x)
        assert.equal(restarted.player.y, intro.player.y)
        await screenshot("restarted-intro")
        await press("A")
        const restartedLive = await expect(s => s.driving === 2 && s.timing && s.countdownVisible,
            "Restart countdown releases the new race with GO visible")
        assert.ok(restartedLive.elapsed < 800, "Restart retained the previous race time")
        assert.ok(restartedLive.lapElapsed < 800, "Restart retained the previous lap time")

        await press("Menu")
        const pausedGo = await expect(s => s.paused, "Pause restarted race during GO")
        assert.equal(pausedGo.countdownVisible, false, "GO was not cleared before pushing the pause scene")
        await select(4)
        await expect(s => s.page === 4 && s.confirmSelection === 1, "Garage exit defaults to Cancel")
        await screenshot("garage-confirmation")
        await press("B")
        await expect(s => s.page === 0 && s.hasRace, "B cancels Garage exit")
        await select(4)
        await select(0)
        const garage = await expect(s => s.driving === 0 && !s.paused && !s.hasRace,
            "Confirmed exit cleans up the race")
        assert.equal(garage.player, null)
        assert.equal(garage.racers.length, 0)
        assert.equal(garage.timing, false)
        assert.equal(garage.countdownVisible, false)
        await screenshot("garage-return")
        // Exercise the real menu after cleanup, rather than only its picture.
        for (let i = 0; i < 3; i++) await press("Down")
        await press("A")
        assert.equal(await screenshot("drive-after-exit"), api.expectedScreens["drive-modes"].sha256,
            "Drive did not reopen after leaving the race")
        await press("A")
        assert.equal(await screenshot("race-list-after-exit"), api.expectedScreens["race-list"].sha256,
            "Races did not reopen after leaving the race")
        console.log("PASS: grid/live pause, frozen race state, submenus, restart/cancel, Garage cleanup and Drive")
    } catch (error) {
        // Preserve the actual failing state, including an unsettled game frame.
        try {
            samples.push({ label: "FAILURE: " + error.message, state: await state() })
            const capture = await api.captureCanvas()
            fs.writeFileSync(path.join(api.artifacts, "pause-failure.png"), capture.png)
        } catch { /* Keep the original assertion if the simulator itself died. */ }
        throw error
    } finally {
        fs.writeFileSync(path.join(api.artifacts, "race-pause-state-log.json"),
            JSON.stringify(samples, null, 2) + "\n")
    }
}
