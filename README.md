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
- **B:** Leave Free Roam and return to the Garage. The B button intentionally has no effect during a race.

## Game Files

### `ai_racers.ts`

Owns the AI race subsystem. It consumes the active race definition, creates and removes opponents, applies randomized paint, steers racers through the cached track route, switches their directional images, and tracks checkpoint and lap progress.

### `car_assets.ts`

Catalogs every base body image and primary, secondary, and accent paint layer in directional order. Both player rendering and AI appearance use these shared image arrays.

### `customization.ts`

Contains the paint catalog, ownership and equipped-color state, body-specific source-color mappings, and recoloring operations used by the player image cache and Garage previews.

### `freeroam_world.ts`

Defines the Forest, Highway, and Cave Free Roam themes. It clones the selected authored map, randomizes theme-specific scenery while protecting the spawn area and important routes, creates the Free Roam player, and handles the B-button return to the Garage.

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

Calculates the initial vehicle statistics, runs the start menu and placeholder introduction, opens the first Garage visit, and launches the first selected driving mode.

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

Stores browser-persistent progression as one versioned number-array record. It loads and validates cash, race statistics, owned parts and paints, equipped parts, and equipped colors; it also restores clean new-game defaults when progress is reset.

### `sprite_kinds.ts`

Declares the custom sprite kinds shared across the project, including AI racers, the visible player-car sprite, and minimap HUD sprites.

### `vehicle_sounds.ts`

Defines the acceleration, turning, and wall-impact sound effects used by the player's car. It exposes playback helpers and manages a shared cooldown so short driving sounds do not overlap excessively.

## MakeCode Dependencies

The project uses the following MakeCode Arcade extensions:

- Arcade Storytelling for menus and cutscenes.
- Arcade Minimap for the race minimap.
- Status Bar for the durability HUD.
- Arcade Tile Util for cloning and modifying Free Roam maps.
