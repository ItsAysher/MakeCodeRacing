# Racing

Racing is a driving, time-trial, and vehicle-progression game for Microsoft MakeCode Arcade. Build a car in the Garage, race a deterministic field of named rivals across three circuits, chase medals and personal records, or explore three persistent procedural Free Roam worlds to master special abilities.

The product rationale, implementation ordering, experience-impact ranking, and
next-release backlog are recorded in [POLISH_DESIGN.md](POLISH_DESIGN.md).

## Core Gameplay Loop

1. Buy, equip, and preview engine, wheel, body, brake, and paint upgrades in the Garage.
2. Enter a circuit event or explore Forest, Highway, and Cave Free Roam.
3. Race through route gates in order, manage durability, and finish before the event time limit.
4. Earn cash from classified finishes, placement, clean driving, and remaining time.
5. Improve the car, unlock tougher events, and return for faster medals and personal records.

The four mechanical upgrade categories have distinct roles:

- **Engine:** top speed and acceleration.
- **Wheels:** acceleration and speed-sensitive steering.
- **Body:** durability and performance efficiency.
- **Brakes:** stopping power and the transition into reverse.

Intermediate races and all Free Roam themes unlock at three wins. Expert races unlock at seven wins. Each circuit awards Bronze for a classified finish and has its own Silver and Gold time targets.

## Product Features

- A controller-native start menu, Garage, event briefings, records screen, settings, and in-game help.
- Forward and reverse layouts for every circuit, with independent records and layout-aware grids, routes, briefings, and rivals.
- A three-round Beginner-to-Expert championship with stable opponents, 10/7/5/3/1 points, DNF classification, standings, and a $1,000 champion bonus.
- Compact pre-race field cards that identify the exact named rival field using its deterministic paint colors.
- A staged grid countdown, ordered checkpoint validation, wrong-way feedback, live place, lap timing, race timing, and durability HUDs.
- Deterministic named rivals with per-driver pace, steering, cornering, recovery, collision avoidance, and true finish order.
- Results that show finish status, place, time, fastest lap, medal, new records, and an itemized reward breakdown.
- Persistent best race times, best laps, best finishes, medals, cash, equipment, paint, mastery progress, and discovered activity coordinates.
- A dedicated race pause menu with Resume, Restart Race, Controls, Settings, and Return to Garage actions.
- Infinite seed-stable Forest, Highway, and Cave worlds built around authored home areas, with a streamed map, home guidance, and discovered-activity markers.
- Three mastery paths: defeat Forest rivals for Boost, complete Highway loops for Drift, and return Cave racer statues for Blink.
- MakeCode-native mentor cars, stone racers, landmarks, ability icons, HUD art, driving effects, and accessibility-aware presentation.
- Player options for sound, camera shake, high-contrast HUD colors, driving effects, handling presets, steering assist, and brake assist. Dedicated paged Settings, Accessibility, and Driving Assists menus expose these controls without changing opponent difficulty or rewards.
- Four-slot Garage menus keep `More` in the third slot and `Back` in the fourth. The top-level Garage keeps `Drive` in the fourth slot on every page so Race and Free Roam are always reachable.

## Controls

- **D-pad / directional buttons:** Throttle and steer. Opposite input decelerates before engaging reverse.
- **A:** Brake. In menus, confirm the highlighted action.
- **B:** Use the selected Free Roam ability. Hold while steering when Drift is selected. In menus, go back or close the current screen.
- **Menu:** Open the Free Roam map/ability menu or pause an active race.

The Free Roam menu cycles the selected unlocked ability and remembers that selection. Locked abilities remain visible as mastery goals; the ability HUD communicates the selection, lock state, active duration, and cooldown.

## Game Files

### `ai_racers.ts`

Owns the AI race subsystem. It creates a deterministic named field from the active event, applies paint and driver profiles, steers through the cached route, avoids nearby cars, recovers from stalls, switches directional images, validates ordered lap progress, and records each rival's true finishing place.

### `car_assets.ts`

Catalogs every base body image and primary, secondary, and accent paint layer in directional order. Both player rendering and AI appearance use these shared image arrays.

### `customization.ts`

Contains the paint catalog, ownership and equipped-color state, body-specific source-color mappings, and recoloring operations used by the player image cache and Garage previews.

### `freeroam_world.ts`

Defines the Forest, Highway, and Cave themes, dispatches player/home coordinates for the map screen, creates the Free Roam player on the selected generator's spawn, and presents the mode instructions.

### `freeroam_coordinates.ts`

Captures the player's logical spawn tile as `(0,0)` at the start of every Free Roam session and reports the player's current tile displacement from that origin. Coordinates remain stable while the procedural generators recycle and rebase their visible tile windows; positive X points right and positive Y points down.

### `freeroam_map_activities.ts`

Stores map discovery for the three Forest racers, three Highway drift racers, and three Cave statues. An activity is revealed only after its chunk enters the generated 3x3 window; its discovery bit and logical world-tile position are then saved so an off-window map arrow can continue pointing toward it after streaming or restarting the browser. Collected Cave statues stop appearing as targets, while Forest rematch racers and completed Highway landmarks remain available.

### `freeroam_generation.ts`

Contains procedural systems shared by every Free Roam theme: persistent master-seed creation, deterministic theme-seed derivation and coordinate hashing, signed-coordinate helpers, fixed 24x24 streaming-map creation, logical/physical coordinate conversion, section-boundary detection, seamless player rebasing, selected-generator start/stop dispatch, and the single active streaming update callback.

### `freeroam_forest_generation.ts`

Owns infinite Forest Free Roam generation. It preserves the authored 32x32 map inside a centered 40x40 home region, then streams deterministic 8x8 woodland, dense-forest, and clearing sections beyond its aligned exits. Each section is built completely—with trails, scenery, and decoration—before handing the finished tiles to the separate river overlay. Terrain and floor-backed flowers are reconstructed consistently when revisited without retaining an ever-growing world.

### `freeroam_forest_river.ts`

Owns all Forest river topology and rendering. Each 64x64 logical world region has a 35% chance to contain one isolated horizontal or vertical river measuring 30-50 tiles from end to end. Smoothly eased deterministic centerlines produce broad S-curves without disconnected steps, while the inset endpoints prevent rivers in neighboring regions from joining into enclosing boundaries. Water is two or three tiles wide and solid; `sprites.castle.tilePath5` forms the exact one-tile bank around the final water mask. The river is applied after base-section construction, so water and sand replace any trail, scenery, wall, or decoration previously stamped at those coordinates.

### `freeroam_forest_mastery.ts`

Places three seed-stable forest challengers on generated trails. Bramble, Ember, and Phantom each use unique four-direction native car art and open a different MakeCode-native course with authored starts, finish gate, and waypoint route. Their AI scales against the player's unboosted car while remaining beatable. Three unique victories permanently unlock and select Boost.

### `freeroam_highway_generation.ts`

Owns infinite Highway Free Roam generation. It preserves the authored home map, extends its original six-wide exits directly into generated six-lane roads, and makes route decisions on a seeded macro grid so straight sections span 32-56 tiles before the next gradual turn or junction. Traffic cones are generated only on the solid shoulder tiles; driveable lanes can contain cosmetic cracks but never cones. Exactly three non-overlapping loop starts are reserved within a 200-tile radius of the home spawn, with a protected northern feeder ensuring all three are reachable without a rare seeded detour; eligible anchors beyond that radius retain the ordinary seeded 24% loop chance. Each loop has an elevated vertical chord: a car arriving from the loop rim is deliberately rendered below the cached overhang, while a car on the chord renders above it. Both routes share an unobstructed collision plane. Stable decoration, grass variants, and at most nine active bridge sprites use fixed memory.

### `freeroam_highway_mastery.ts`

Uses the three guaranteed home-area loops as drift trials. Neon, Apex, and Goldline wait beside their respective gates in unique native car art. Eight streamed, orientation-aware cone gates lead the player clockwise around each loop at progressively higher minimum speeds. A trial cancels after an invalid early return or leaving the course; completed gates and mentor markers remain visibly complete. Clearing all three trials permanently unlocks and selects Drift.

### `freeroam_cave_generation.ts`

Owns browser-only infinite Cave Free Roam generation. The authored 32x32 cave is the definitive center of the world and is placed inside a 40x40 aligned home region whose four wrapper tunnels extend its existing edge sockets into procedural branches. Beyond those edges, reciprocal rules assemble Straight, Turn, T-junction, and Cross sections without mismatched openings or dead ends. A reusable 3x3 window of 8x8 sections follows the player without changing velocity.

Cave rubble, moss, and solid crystals are selected deterministically so they remain stable when the window rebases. Each decoration is composited over a verified cave floor image; walls never receive decorations. The spawn remains clear, and crystals are excluded from the main base-map cross and generated driving corridors.

### `freeroam_cave_mastery.ts`

Places three distinct stone racer statues on native pedestals at distant seed-stable cave sites. The player carries one at a time back to the home altar; collected sites retain empty pedestals after unloading, revisiting, or restarting the game. Returning all three permanently unlocks and selects Blink.

### `ability_input.ts`

Centralizes the selected Free Roam ability and its persistent controller-B input for both the simulator and physical Arcade hardware.

### `ability_boost.ts`

Owns Boost independently from its Forest unlock encounter. Once unlocked and selected, B activates it in every Free Roam theme, raises top speed to 1.5x for 1.8 seconds, enforces a five-second cooldown, and clamps the car back to its normal cap when the effect ends.

### `ability_blink.ts`

Owns Blink independently from its Cave unlock encounter. Once unlocked and selected, B moves the car up to five tiles along its facing direction, checks every intermediate collision tile, and enforces a five-second cooldown in every Free Roam theme.

### `ability_drift.ts`

Owns hold-to-use Drift independently from its Highway unlock encounter. Once unlocked, holding B while Drift is selected blends extra steering into normal movement for tighter turns without adding speed or overriding braking.

### `ability_hud.ts`

Displays the selected ability with native icons, its locked or ready state, and time-based active/cooldown feedback while keeping allocations bounded.

### `driving_effects.ts`

Creates lightweight skid, dust, and speed feedback from reusable Arcade sprites. The system respects the Driving FX setting and clears its effects during transitions.

### `freeroam_menu.ts`

Owns both controller-native driving menus. In Free Roam it offers Display Map, ability selection, and Exit Free Roam; the map renders the streamed 24x24 window, player, home guidance, coordinates, and numbered discovered activities. During grid or live race states it opens a dedicated pause scene with Resume, Restart Race, Controls, Settings, and Return to Garage, including confirmation for destructive choices and a fresh countdown when resuming a paused grid.

### `game_settings.ts`

Defines the product version and persistent presentation options for sound, camera shake, high-contrast HUD colors, driving effects, and selected ability. Its paged Settings and Accessibility menus keep navigation actions in predictable slots. Settings use a separate versioned record so toggles never rewrite career progress.

### `driving_assists.ts`

Defines Relaxed, Balanced, and Precision handling presets plus optional steering and brake assists. Assists respond only to active player input and hard, fast cornering; they never steer a stationary car, choose a route, alter rivals, or change rewards.

### `championship.ts`

Owns the three-event championship state, stable rival roster, position-based points, DNF handling, sorted standings, forward-only event sequence, final trophy presentation, and champion bonus. Opening and backing out of another mode menu preserves an active series; confirming another event abandons it deliberately.

### `game_flow.ts`

Defines the selected driving mode and the single authoritative driving-session state. It launches Race or Free Roam and performs shared player, camera, and tilemap cleanup when a session ends.

### `garage.ts`

Owns the main Garage navigation. It routes to Race, Parts, Paint, Vehicle Stats, Career, Records, Settings, and Reset Progress while surfacing the next progression milestone. `Drive` remains visible on both Garage pages.

### `garage_core.ts`

Contains shared Garage state, background selection, strict four-slot paginated menu helpers, and the cutscene wrapper used to open the Garage and launch the next driving mode.

### `garage_mode_selection.ts`

Handles Beginner, Intermediate, Expert, Championship, and Free Roam selection. Circuit labels expose layout-specific medals, and a confirmation briefing shows the active layout, laps, rivals, prize, time limit, personal bests, and medal targets before launch. The menu also enforces the three- and seven-win milestones.

### `garage_paint.ts`

Implements paint purchasing, paginated paint selection, primary/secondary/accent customization, and the cached Garage car preview.

### `garage_parts.ts`

Implements part labels, purchasing, equipping, shared category-selection logic, the parts menu, and the vehicle-performance statistics screen.

### `main.ts`

Loads settings and career progress, protects incompatible saves, welcomes or names the player, calculates initial vehicle statistics, and runs the Start, How to Play, Settings, and About menu before entering the Garage.

### `minimap.ts`

Owns the native tilemap renderer and race minimap HUD. It caches the full static track image once per race, reuses a fixed viewport image, redraws only when the player changes minimap position or appearance, and releases the large track cache when the race ends. Free Roam reuses the same renderer for its map screen.

### `player_health.ts`

Implements race durability and collision damage. It creates and removes the durability HUD, applies damage with collision cooldowns, separates colliding vehicles, detects wrecks, and reports them to the race-result flow. Wall impacts play sound in both driving modes, but durability damage applies only during races.

### `player_movement.ts`

Owns the shared player sprite and hidden collision image. It creates and destroys the player, performs acceleration, coasting, braking, reversing, steering, and cornering calculations, and delegates visible artwork to the renderer.

### `player_rendering.ts`

Owns the visible player-car sprite, customization compositing, directional image cache, direction detection, and synchronization with the hidden collision sprite. Its four cached images rebuild only after a body or paint change.

### `player_stat_calculations.ts`

Converts the equipped part ratings into the vehicle values used by gameplay. It calculates speed, acceleration, braking, durability, body efficiency, reverse performance, and speed-sensitive steering response whenever the loadout changes.

### `player_stats.ts`

Contains the vehicle-part catalog and persistent loadout state for the current session. It defines part names, prices, ownership, equipped tiers, and the raw ratings supplied by each engine, wheel, body, and brake tier.

### `progression.ts`

Owns cash, wins, races raced, reward application, and milestone notifications for Intermediate/Free Roam at three wins and Expert at seven.

### `race.ts`

Owns the race state flow from intro and grid through countdown, running, finish, and results. It coordinates ordered player laps, AI finish order, timeout/wreck classification, pause-safe cleanup, record callouts, itemized rewards, rematch, and Garage return. It locks the result state before presentation so simultaneous finish, timeout, and wreck events cannot record a race twice.

### `race_progress.ts`

Provides the pause-aware delta clock, route-segment cache, ordered checkpoint gates, wrong-way detection, live placement, lap/race records, medal targets, finish classification, and reward calculation.

### `race_hud.ts`

Reuses a fixed image-backed HUD for lap, place, elapsed time, last lap, banners, and wrong-way warnings, with standard and high-contrast palettes.

### `race_definitions.ts`

Stores the complete authored configuration for each difficulty: map, name, player and AI spawns, lap target, prize, timer, opponent count and speed, body tier, paint source colors, AI route, and forward/reverse layout transforms.

### `rival_cards.ts`

Builds compact MakeCode-native pre-race cards from the active event definition, layout, named rival profiles, and deterministic paint colors. Text is fitted to fixed cells so all three field sizes remain readable.

### `ui_text.ts`

Provides allocation-light text fitting and fixed-font centering used by HUDs, field cards, standings, and other constrained 160x120 layouts.

Current race settings are:

| Difficulty | Laps | Prize | Time limit | Gold | Silver | Opponents |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Beginner | 1 | $100 | 45 seconds | 26 seconds | 33 seconds | 2 |
| Intermediate | 2 | $500 | 100 seconds | 65 seconds | 80 seconds | 3 |
| Expert | 3 | $1300 | 210 seconds | 150 seconds | 180 seconds | 4 |

### `save_system.ts`

Stores browser-persistent progression as a versioned number-array record and keeps the player name separate so routine updates do not rewrite it. Version 2 includes career totals, records, equipment, paint, deterministic world state, mastery, ability unlocks, and activity-map discoveries. Version-1 careers migrate forward with safe defaults. Unknown, newer, or incomplete saves are placed in read-only protection instead of being overwritten; Reset Progress explicitly restores writable clean defaults.

### `sprite_kinds.ts`

Declares the custom sprite kinds shared across the project, including AI racers, the visible player-car sprite, and minimap HUD sprites.

### `vehicle_sounds.ts`

Defines the acceleration, turning, and wall-impact sound effects used by the player's car. It exposes playback helpers and manages a shared cooldown so short driving sounds do not overlap excessively.

## MakeCode Dependencies

The project uses Arcade Storytelling for controller menus and cutscenes. The minimap and durability bar are now project-owned native image/sprite implementations; removing their general-purpose extensions recovered enough native code space for the championship, reverse layouts, assists, and field cards.

The project deliberately uses native `image.print`, controller input, sprite HUDs, and a delta-time race clock instead of adding font, timer, animation, settings, minimap, status-bar, or sprite-data extensions. This keeps memory use and hardware behavior predictable.

The full game exceeds the flash budget of lower-capacity nRF52833 and SAMD51 boards. `mkc.json` therefore defaults native CLI builds to RP2040; the nRF52840 (`n4`) variant also builds successfully. The browser simulator and JavaScript build remain unrestricted.

## Native Asset Workflow

`images.g.jres` is the source of truth for project images. `images.g.ts` is generated code and must never be assembled or edited by hand.

To add or revise the polish asset set:

1. Update the pixel-art construction in `tools/generate_polish_assets.mjs`.
2. Run `node tools/generate_polish_assets.mjs`. The generator preserves unrelated assets and stable IDs while writing MakeCode F4 image records.
3. In the VS Code MakeCode Arcade panel, click **Start MakeCode Simulator**. This active MakeCode build normally regenerates `images.g.ts` from the JRES catalog.
4. If the extension does not refresh the generated binding file, reload VS Code with **Developer: Reload Window**, then click **Start MakeCode Simulator** again.
5. For a headless or still-stale workspace, run `node tools/regenerate_image_bindings.mjs`. This fallback delegates the entire file to MakeCode's cached `pxt.emitProjectImages` emitter; it does not hand-author bindings. A MakeCode build must have populated `.pxt/mkc-cache` first.

The F4 payload is Arcade's native column-major format. Every column packs two vertical 4-bit pixels per byte and is aligned to a four-byte stride. Use the generator and validator rather than manipulating its base64 payload directly.

## Validation

Run these checks from the project root after code or asset changes:

```powershell
node tools/validate_assets.mjs
node tools/regenerate_image_bindings.mjs --check
node tools/compile_makecode.mjs
./tools/validate-release.ps1 -SkipBuild
node tools/smoke-simulator.mjs
# Cached official CLI; defaults to RP2040 through mkc.json
makecode build --native --always-built
```

The asset validator is read-only. It verifies JSON structure, unique IDs and display names, canonical base64, F4 headers, dimensions and aligned payload lengths, then decodes every image and compares it pixel-for-pixel with both aliases in the MakeCode-generated `images.g.ts` factory. The binding check independently proves the generated file exactly matches MakeCode's current emitter output. The release validator checks package membership, JRES encoding, four-choice Story menus, and stable Garage slots. The zero-install smoke runner starts a temporary local simulator and headless browser, enters a new profile, and verifies 16 controller-driven checkpoints through Garage, Settings, Accessibility, Races, the Reverse-layout toggle, and the Beginner race launch against a reviewed canvas baseline. The final command compiles the complete project for native Arcade hardware.
