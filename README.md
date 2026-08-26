# Racing

Racing is a work-in-progress driving and progression game for Microsoft MakeCode Arcade, developed in Visual Studio Code. The player earns cash by winning races, spends that cash on car upgrades, and gradually builds a vehicle capable of competing against stronger opponents.

The game has three race difficulties: Beginner, Intermediate, and Expert. Each level increases the lap count, time limit, opponent count, rewards, and opponent performance. It also includes Forest, Highway, and Cave Free Roam maps for driving outside of races.

## Core Gameplay Loop

1. Visit the Garage and equip or purchase car parts.
2. Select a race difficulty or a Free Roam map.
3. Complete race laps before the timer expires or an AI opponent finishes.
4. Earn cash and wins from successful races.
5. Return to the Garage and improve the car for harder races.

The car can be upgraded in four categories:

- **Engine:** contributes speed and acceleration.
- **Wheels:** contribute speed and acceleration.
- **Body:** determines durability and how efficiently the car uses its available speed.
- **Brakes:** determine braking strength.

## Controls

- **Directional buttons:** Accelerate and steer in the selected direction. Opposite input slows the car before engaging reverse.
- **A:** Brake.
- **M:** Open or close the Free Roam menu while using the browser simulator.
- **B:** Return from the generated-map screen or close the Free Roam menu. It intentionally has no effect during normal driving or races.
- **J:** Use Boost in any Free Roam after defeating all three forest challengers.
- **K:** Use Blink in any Free Roam after returning all three stone racer statues.
- **L:** Hold Drift in any Free Roam after completing all three highway loop trials.

## Game Files

### `ai_racers.ts`

Owns the AI race subsystem. It consumes the active race definition, creates and removes opponents, applies randomized paint, steers racers through the cached track route, switches their directional images, and tracks valid lap progress.

### `car_assets.ts`

Catalogs every base body image and primary, secondary, and accent paint layer in directional order. Both player rendering and AI appearance use these shared image arrays.

### `customization.ts`

Contains the paint catalog, ownership and equipped-color state, body-specific source-color mappings, and recoloring operations used by the player image cache and Garage previews.

### `freeroam_world.ts`

Defines the Forest, Highway, and Cave themes, dispatches player/home coordinates for the map screen, creates the Free Roam player on the selected generator's spawn, and presents the mode instructions.

### `freeroam_coordinates.ts`

Captures the player's logical spawn tile as `(0,0)` at the start of every Free Roam session and reports the player's current tile displacement from that origin. Coordinates remain stable while the procedural generators recycle and rebase their visible tile windows; positive X points right and positive Y points down.

### `freeroam_generation.ts`

Contains procedural systems shared by every Free Roam theme: persistent master-seed creation, deterministic theme-seed derivation and coordinate hashing, signed-coordinate helpers, fixed 24x24 streaming-map creation, logical/physical coordinate conversion, section-boundary detection, seamless player rebasing, selected-generator start/stop dispatch, and the single active streaming update callback.

### `freeroam_forest_generation.ts`

Owns infinite Forest Free Roam generation. It preserves the authored 32x32 map inside a centered 40x40 home region, then streams deterministic 8x8 woodland, dense-forest, and clearing sections beyond its aligned exits. Each section is built completely—with trails, scenery, and decoration—before handing the finished tiles to the separate river overlay. Terrain and floor-backed flowers are reconstructed consistently when revisited without retaining an ever-growing world.

### `freeroam_forest_river.ts`

Owns all Forest river topology and rendering. Each 64x64 logical world region has a 35% chance to contain one isolated horizontal or vertical river measuring 30-50 tiles from end to end. Smoothly eased deterministic centerlines produce broad S-curves without disconnected steps, while the inset endpoints prevent rivers in neighboring regions from joining into enclosing boundaries. Water is two or three tiles wide and solid; `sprites.castle.tilePath5` forms the exact one-tile bank around the final water mask. The river is applied after base-section construction, so water and sand replace any trail, scenery, wall, or decoration previously stamped at those coordinates.

### `freeroam_forest_mastery.ts`

Places three seed-stable B2 forest challengers on generated trails. Each NPC opens a different native MakeCode track with its own start positions, finish gate, and authored waypoint route. Their AI uses the standard velocity-seeking racer steering at 84%, 89%, and 94% of the player's unboosted top speed, keeping the challenges beatable while scaling with upgrades. Three unique victories permanently unlock Boost.

### `freeroam_highway_generation.ts`

Owns infinite Highway Free Roam generation. It preserves the authored home map, extends its original six-wide exits directly into generated six-lane roads, and makes route decisions on a seeded macro grid so straight sections span 32-56 tiles before the next gradual turn or junction. Traffic cones are generated only on the solid shoulder tiles; driveable lanes can contain cosmetic cracks but never cones. Exactly three non-overlapping loop starts are reserved within a 200-tile radius of the home spawn, with a protected northern feeder ensuring all three are reachable without a rare seeded detour; eligible anchors beyond that radius retain the ordinary seeded 24% loop chance. Each loop has an elevated vertical chord: a car arriving from the loop rim is deliberately rendered below the cached overhang, while a car on the chord renders above it. Both routes share an unobstructed collision plane. Stable decoration, grass variants, and at most nine active bridge sprites use fixed memory.

### `freeroam_highway_mastery.ts`

Uses the same three guaranteed home-area loops as drift trials. Each starting gate has a streamed, right-facing B2 placeholder racer on its shoulder; approaching an unfinished trial once per visit opens a `showLongText` explanation, and leaving the area rearms the dialogue. Eight streamed, orientation-aware cone gates span all six lanes and lead the player clockwise around each loop at a progressively higher minimum speed. A trial cancels if the player returns through its start too soon or leaves the loop area, so another trial can always begin. Completed gates and their NPC marker remain green when revisited. Clearing all three trials permanently unlocks Drift.

### `freeroam_cave_generation.ts`

Owns browser-only infinite Cave Free Roam generation. The authored 32x32 cave is the definitive center of the world and is placed inside a 40x40 aligned home region whose four wrapper tunnels extend its existing edge sockets into procedural branches. Beyond those edges, reciprocal rules assemble Straight, Turn, T-junction, and Cross sections without mismatched openings or dead ends. A reusable 3x3 window of 8x8 sections follows the player without changing velocity.

Cave rubble, moss, and solid crystals are selected deterministically so they remain stable when the window rebases. Each decoration is composited over a verified cave floor image; walls never receive decorations. The spawn remains clear, and crystals are excluded from the main base-map cross and generated driving corridors.

### `freeroam_cave_mastery.ts`

Places three stone B2 racer statues on placeholder pedestals at distant seed-stable cave sites. The player carries one at a time back to the home altar; collected sites retain empty pedestals after unloading, revisiting, or restarting the game. Returning all three permanently unlocks Blink.

### `ability_input.ts`

Centralizes browser-only keyboard input for the single-player unlockable abilities using Microsoft's Browser Events extension. J, K, and L are independent keyboard buttons rather than remapped Player 1-4 controls, so Player 1's arrow, A, B, and M controls remain unchanged.

### `ability_boost.ts`

Owns the J-key Boost behavior independently from its Forest unlock encounter. Once unlocked, Boost works in every Free Roam theme, raises top speed to 1.5x for 1.8 seconds, enforces a five-second cooldown, and clamps the car back to its normal cap when the effect ends. Pressing J before unlocking it displays `Boost locked. Explore Forest` only during Free Roam.

### `ability_blink.ts`

Owns the K-key Blink behavior independently from its Cave unlock encounter. Once unlocked, Blink works in every Free Roam theme, moves up to five tiles along the car's facing direction, checks every intermediate collision tile, and enforces a five-second cooldown. Pressing K before unlocking it displays `Blink locked. Explore Cave` only during Free Roam.

### `ability_drift.ts`

Owns the L-key Drift behavior independently from its Highway unlock encounter. Once unlocked, holding Drift works in every Free Roam theme and blends extra steering into normal movement for tighter turns without adding speed or overriding braking. Pressing L before unlocking it displays `Drift locked. Explore Highway` only during Free Roam.

### `freeroam_menu.ts`

Remaps the simulator Menu input to the keyboard's M key and replaces it with a Free Roam-only pause menu containing Display Map and Exit Freeroam. Display Map renders the complete currently generated 24x24 tile window at a near-full-screen scale, marks the player, and draws an arrow toward the definitive home chunk. The standard Arcade system menu remains available outside Free Roam.

### `game_flow.ts`

Defines the selected driving mode and the single authoritative driving-session state. It launches Race or Free Roam and performs shared player, camera, and tilemap cleanup when a session ends.

### `garage.ts`

Owns the main Garage navigation. It routes to Parts, Paint, Player Stats, and driving-mode selection. Player Stats displays cash, wins, and races raced.

### `garage_core.ts`

Contains shared Garage state, background selection, extended and paginated menu helpers, and the cutscene wrapper used to open the Garage and launch the next driving mode.

### `garage_mode_selection.ts`

Handles Beginner, Intermediate, Expert, and Free Roam selection. It enforces win requirements and stores the selected race difficulty, Free Roam theme, and driving mode.

### `garage_paint.ts`

Implements paint purchasing, paginated paint selection, primary/secondary/accent customization, and the cached Garage car preview.

### `garage_parts.ts`

Implements part labels, purchasing, equipping, shared category-selection logic, the parts menu, and the vehicle-performance statistics screen.

### `main.ts`

Loads saved progress, welcomes returning players by name or prompts new players to choose one, calculates the initial vehicle statistics, runs the start menu, opens the first Garage visit, and launches the first selected driving mode.

### `minimap.ts`

Owns the race minimap HUD. It caches the full static track image once per race, reuses a fixed viewport image, redraws only when the player changes minimap position or appearance, and releases the large track cache when the race ends.

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

Owns cash, wins, races raced, and race-result bookkeeping for the current session.

### `race.ts`

Owns race startup, player lap progress, race-only cleanup, and result presentation. It changes the session state before showing results so simultaneous finish, timeout, and wreck events cannot record a race more than once.

### `race_definitions.ts`

Stores the complete authored configuration for each difficulty: map, name, player and AI spawns, lap target, prize, timer, opponent count and speed, body tier, paint source colors, and AI route.

Current race settings are:

| Difficulty | Laps | Prize | Time limit | Opponents |
| --- | ---: | ---: | ---: | ---: |
| Beginner | 1 | $100 | 40 seconds | 2 |
| Intermediate | 2 | $500 | 55 seconds | 3 |
| Expert | 3 | $1300 | 120 seconds | 4 |

### `save_system.ts`

Stores browser-persistent progression as a versioned number-array record and stores the player name under a separate string key so ordinary progression updates do not rewrite it. It loads and validates cash, race statistics, owned parts and paints, equipped parts, equipped colors, player identity, the permanent Free Roam seed, carried/deposited statues, NPC victories, loop trials, and ability unlocks. Older version-1 saves without mastery fields remain compatible, and Reset Progress restores clean defaults for both garage and procedural-world state.

### `sprite_kinds.ts`

Declares the custom sprite kinds shared across the project, including AI racers, the visible player-car sprite, and minimap HUD sprites.

### `vehicle_sounds.ts`

Defines the acceleration, turning, and wall-impact sound effects used by the player's car. It exposes playback helpers and manages a shared cooldown so short driving sounds do not overlap excessively.

## MakeCode Dependencies

The project uses the following MakeCode Arcade extensions:

- Arcade Storytelling for menus and cutscenes.
- Arcade Minimap for the race minimap.
- Status Bar for the durability HUD.
