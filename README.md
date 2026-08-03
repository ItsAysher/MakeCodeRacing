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

Owns the AI race subsystem. It chooses opponent count, speed, body tier, and randomized colors from the selected difficulty; creates and removes opponents; steers them through track waypoints; updates their directional artwork; and tracks their checkpoint and lap progress. An opponent that completes the required laps reports a race loss to the shared race-result flow.

### `freeroam_world.ts`

Defines the Forest, Highway, and Cave Free Roam themes. It clones the selected authored map, randomizes theme-specific scenery while protecting the spawn area and important routes, installs the temporary map, and releases its stored state on exit. It also handles the B-button transition from Free Roam back to the Garage.

### `garage.ts`

Owns the Garage interface and progression economy. Its main menu routes to the parts shop, paint shop, and driving-mode selection. It changes Garage backgrounds, displays part and statistics menus, purchases and equips upgrades and paints, enforces race and Free Roam unlock requirements, and stores the player's next driving selection. It also records completed races, awards cash and wins, and runs Garage visits inside storytelling cutscenes before launching the selected mode.

### `main.ts`

Defines session-level values such as cash, wins, races completed, and the shared player sprite reference. It calculates the initial vehicle statistics, clears the initial tilemap, runs the start menu and introduction, opens the first Garage visit, and launches the first selected driving mode.

### `player_health.ts`

Implements race durability and collision damage. It creates and removes the durability HUD, applies damage from walls and AI racers with collision cooldowns, separates colliding vehicles, detects a wrecked player car, and reports wrecks to the shared race-result flow. Wall impacts play sound in both driving modes, but durability damage applies only during races.

### `player_movement.ts`

Owns the player's hidden collision sprite and performs frame-by-frame acceleration, coasting, braking, reversing, steering, and cornering calculations while a driving mode is active. It delegates the visible car artwork to the player renderer.

### `player_rendering.ts`

Owns the player's visible car sprite, all directional body and color-layer image arrays, image compositing, and the logic that switches artwork when the equipped body or driving direction changes.

### `customization.ts`

Contains the paint catalog, ownership and equipped-color state, body-specific source-color mappings, and the recoloring logic used by both the driving renderer and Garage car preview.

### `player_stat_calculations.ts`

Converts the equipped part ratings into the vehicle values used by gameplay. It calculates speed, acceleration, braking, durability, body efficiency, reverse performance, and speed-sensitive steering response whenever the loadout changes.

### `player_stats.ts`

Contains the vehicle-part catalog and persistent loadout state for the current session. It defines part names, prices, ownership, equipped tiers, and the raw ratings supplied by each engine, wheel, body, and brake tier.

### `race.ts`

Coordinates both Race and Free Roam sessions. It defines the available modes and difficulties, loads race maps, configures laps, prizes, time limits, player systems, countdowns, and the race minimap, and tracks player checkpoints and laps. Race results are deferred into a storytelling cutscene so collision processing finishes before `leaveForGarage` removes the player and tilemap; the same cleanup function performs mode-specific shutdown before the Garage opens.

Current race settings are:

| Difficulty | Laps | Prize | Time limit | Opponents |
| --- | ---: | ---: | ---: | ---: |
| Beginner | 1 | $100 | 40 seconds | 2 |
| Intermediate | 2 | $200 | 55 seconds | 3 |
| Expert | 3 | $500 | 65 seconds | 4 |

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
