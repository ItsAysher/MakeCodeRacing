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

## Script Responsibilities

### `main.ts`

Defines the player's session metadata, including cash, wins, and races completed. It recalculates the initial car statistics and controls the opening sequence, start menu, introductory text, first Garage visit, and launch of the selected driving mode.

### `sprite_kinds.ts`

Defines the custom sprite kinds shared by the game's systems. These identify cars, AI racers, minimap HUD elements, and the visible portion of the player's car.

### `player_stats.ts`

Contains the car-part catalog and the player's loadout state. It defines part names, prices, ownership, equipped tiers, and the rating values supplied by each engine, wheel, body, and brake tier.

### `player_stat_calculations.ts`

Converts the equipped parts into derived car statistics and movement values. It calculates top speed, acceleration, braking, durability, body efficiency, reverse performance, and speed-dependent steering response.

### `player_movement.ts`

Creates and destroys the player's car and handles its frame-by-frame driving physics. It manages acceleration, coasting, braking, reversing, gradual steering, cornering speed loss, directional car images, and synchronization between the hidden collision sprite and the larger visible car sprite.

### `player_health.ts`

Implements race durability and collision damage. It creates the durability HUD, applies damage from walls and AI racers, adds collision cooldowns and bounce effects, detects when the player's car is wrecked, and ends the current race after durability reaches zero. Wall impacts produce sound in both races and Free Roam, but only races use durability damage.

### `vehicle_sounds.ts`

Defines and plays the player's vehicle sound effects. It handles engine pulses during acceleration, tire noise while turning, wall-crash sounds, and cooldown timing that prevents driving sounds from overlapping excessively.

### `garage.ts`

Controls the Garage menus and the game's upgrade economy. It displays parts and car statistics, purchases and equips upgrades, subtracts cash, enforces win requirements, selects race difficulty or Free Roam theme, records race results, awards prizes, and returns the player to the appropriate driving mode after the Garage closes.

### `race.ts`

Controls the lifecycle of races and Free Roam sessions. It defines driving modes and race difficulties, loads the selected map, configures laps, prizes and time limits, creates the player, starts supporting systems, updates the race minimap, tracks checkpoints and completed laps, handles the countdown, determines race results, and cleans up before returning to the Garage.

Current race settings are:

| Difficulty | Laps | Prize | Time limit | Opponents |
| --- | ---: | ---: | ---: | ---: |
| Beginner | 1 | $100 | 40 seconds | 2 |
| Intermediate | 2 | $200 | 55 seconds | 3 |
| Expert | 3 | $500 | 65 seconds | 4 |

### `ai_racers.ts`

Creates, updates, and removes race opponents. It selects opponent body tiers and randomized colors, varies opponent count and speed by difficulty, steers racers around the track using waypoints, updates their directional images, tracks their checkpoint and lap progress, and ends the race if an opponent finishes first.

### `freeroam_world.ts`

Defines the Forest, Highway, and Cave Free Roam themes. It clones the selected authored map and adds randomized theme-appropriate scenery and obstacles while preserving the spawn area and important travel routes. It also clears the temporary map state when the player leaves the driving session.

## MakeCode Dependencies

The project uses the following MakeCode Arcade extensions:

- Arcade Storytelling for menus and cutscenes.
- Arcade Minimap for the race minimap.
- Status Bar for the durability HUD.
- Arcade Tile Util for cloning and modifying Free Roam maps.
