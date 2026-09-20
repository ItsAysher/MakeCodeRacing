# Release validation tools

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

It starts a temporary local MakeCode server and headless Edge/Chrome profile,
creates a new player, and checks 16 reviewed canvas states through Garage
pagination, Settings, Accessibility, Back navigation, Drive, and Races. Use
`--update-baseline` only after visually reviewing an intentional UI change.
Temporary browser profiles and screenshots are removed after successful runs.

The route also selects Beginner, toggles its Reverse layout, and chooses Start
Race, proving that the Garage can launch the alternate event. Pause/restart,
timeout, wreck, championship, full reverse-route completion, and save-migration
automation remain follow-up coverage.
