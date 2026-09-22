# Release validation tools

Blink's path effects have a focused logic regression suite:

```powershell
node tools/test-blink-effects.mjs
```

Using the cached MakeCode compiler, it checks the production Blink, effect, and
streaming routines for exact start/end coverage, four directions, wall/boundary
limits, cooldowns, world rebasing, untouched car art, disabled FX, and bounded
sprite usage. This does not replace an in-simulator visual check.

Run the repository-owned checks from PowerShell:

```powershell
./tools/validate-release.ps1 -SkipBuild
```

The validator fails when a source file is missing from `pxt.json`, a generated
JRES payload is malformed, a Story menu exceeds four choices, or the Garage no
longer keeps `More` and `Drive` in their stable slots. If a `makecode` command
is available, omit `-SkipBuild` to include the JavaScript build.

This is the fast pre-commit layer. The controller-driven simulator matrix still
covers the critical menu route with no npm dependencies:

```powershell
node tools/smoke-simulator.mjs
```

It first rebuilds the current JavaScript sources (the CLI's `serve --no-watch`
otherwise reuses an old binary), starts a temporary local MakeCode server and headless Edge/Chrome profile,
creates a new player, and checks 16 reviewed canvas states through Garage
pagination, Settings, Accessibility, Back navigation, Drive, and Races. It then
exercises grid/live pause, frozen timers and racers, Controls, all four pause
settings pages, restart/cancel, fresh countdowns, and confirmed Garage exit.
Drive and Races must still match their earlier screens after cleanup. Use
`--update-baseline` only after visually reviewing an intentional UI change.
Temporary browser profiles and screenshots are removed after successful runs.
`--keep-artifacts` retains the screenshots and `race-pause-state-log.json`;
failures retain them automatically, including the failing frame and state.

The lifecycle checks in `smoke-race-pause.mjs` use controller input for every
action and read-only simulator globals for assertions. They do not seed saves,
edit timers, teleport cars, or add game-side test hooks. They specifically pause
during GO to guard against a countdown sprite being destroyed on the wrong
scene and surviving over the Garage. The intro pixel hash masks only its small
animated A-button prompt; the saved PNG remains unmodified. Baselines are
updated only after the complete suite succeeds.

Expert route validation has a separate deterministic regression suite:

```powershell
node tools/test-expert-route.mjs
```

Run a MakeCode build first to populate the compiler cache. The suite executes the
production route code using that cached TypeScript compiler and the authored
Expert tilemap. It checks all 22 road-wide gates, inside-corner regressions,
48 laps across both layouts and two speeds, skipped-gate/off-road rejection,
pause/restart state, real wrong-way warnings and recovery, subpixel road edges,
and unchanged Beginner/Intermediate point gates. These are logic tests, not
controller-driven physics or finish-overlap integration tests. If Expert's
tilemap or AI checkpoint order changes, update `expertRaceGateBounds` and rerun.

The simulator route selects Beginner's Reverse layout and preserves it through
restart. Controller-driven finish, timeout, wreck, championship, full reverse
route completion, and save-migration automation remain follow-up coverage.
