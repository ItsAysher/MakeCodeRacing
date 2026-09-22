# MakeCode Racing Product Polish Design

This document records the product decisions behind the 1.0 polish pass, the
features now owned by the codebase, and the next safe expansion points. Story
and cutscenes are intentionally outside this scope.

## Product Direction

The game should feel like a small, complete arcade racer rather than a driving
prototype. The core pillars are:

1. **Immediate readability:** the player always knows the lap, place, timer,
   durability, selected ability, and reason a lap or action did not count.
2. **Fair mastery:** deterministic rivals, ordered route validation, attainable
   medal targets, and persistent records make improvement legible.
3. **Meaningful ownership:** parts, paint, records, Free Roam discoveries, and
   mastery unlocks survive between sessions without risking older saves.
4. **Controller-first play:** every essential action works with a physical
   Arcade D-pad, A, B, and Menu button.
5. **MakeCode-native presentation:** sprites, F4 JRES art, image text, and a
   delta-time clock avoid unnecessary runtime dependencies.

The compact presentation and readable silhouettes take cues from
[Circuit Superstars](https://collective.square-enix-games.com/en_GB/news/circuit-superstars-questions),
the strong visual identity and flow of
[art of rally](https://noodlecake.com/games/art-of-rally/), and the bright
arcade feedback of
[Victory Heat Rally](https://www.playtonicgames.com/game/victory-heat-rally/).
The implementation remains appropriate for the constraints documented by
[MakeCode Arcade's VS Code workflow](https://arcade.makecode.com/vscode) and
[extension system](https://arcade.makecode.com/extensions).

## Implemented Features: Least to Most Complicated

1. **Localization-safe fixed-width text** — fit and center dynamic names,
   standings, and HUD labels without another font extension.
2. **Sound and camera-shake options** — route existing effects through
   persistent player preferences.
3. **High-contrast HUD option** — recolor race, ability, and durability UI.
4. **Driving-effects option** — allow skid, boost, blink, and impact feedback
   to be disabled instantly.
5. **Economy tune-up** — make tier-two parts and paint reachable earlier while
   keeping tier three aspirational.
6. **Pure vehicle-stat previews** — compare a candidate part against the
   equipped loadout before spending cash.
7. **Native durability and minimap renderers** — replace broad extensions with
   compact fixed-purpose sprite and tile-image implementations.
8. **Expanded Garage career screens** — surface completion, unlock milestones,
   lifetime stats, medals, records, and reset protection.
9. **Race briefings and rival field cards** — show the named painted grid,
   layout, laps, prize, limit, personal best, and medal targets before launch.
10. **Optional driving assists** — provide Relaxed, Balanced, and Precision
    presets plus steering and brake assists without changing rivals or rewards.
11. **Reusable race HUD** — display lap, place, remaining time, last lap, and
    wrong-way feedback without allocating a new image every frame.
12. **Controller-native ability HUD and selector** — expose Boost, Blink, and
    Drift lock, ready, active, and cooldown states on every Free Roam map.
13. **Pause-safe race menu** — provide Resume, confirmed Restart, Controls,
    paged Settings, and confirmed Garage exit during the grid or live race.
14. **Result classification and reward breakdown** — distinguish finish,
    timeout, and wreck; show place, fastest lap, medal, records, durability,
    prize, placement, clean, and time bonuses.
15. **Persistent records and safe save migration** — migrate version-one
    careers, store layout-specific race/lap/finish records, and protect unknown
    or incomplete saves from writes.
16. **Ordered route progress** — require every authored gate in sequence,
    diagnose wrong-way travel, calculate live position, and reject shortcuts.
17. **Deterministic rival profiles** — give named drivers stable acceleration,
    steering, cornering, recovery, avoidance, art, and real finish order.
18. **Retuned event simulation** — align route length, AI capture radius,
    rival pace, time limits, and medal targets so all three events can be
    completed and contested.
19. **MakeCode-native mastery art** — generate three Forest cars in four
    directions, three Highway mentors, three Cave stone racers, pedestals,
    altar, ability icons, and trophy art as validated column-major F4 assets.
20. **Mastery-world integration** — stream the correct art at deterministic
    activity sites, preserve completion badges and carried statues, unlock and
    auto-select abilities, and keep map discoveries/save state coherent.
21. **Reverse circuit layouts** — reverse every authored route, start direction,
    and AI grid while maintaining independent race/lap/medal records.
22. **Three-event championship** — carry a stable field through Beginner,
    Intermediate, and Expert rounds with 10/7/5/3/1 scoring, zero-point DNFs,
    sorted standings, a trophy finale, and a champion bonus.
23. **Hardware-oriented release tooling** — validate JRES/generated bindings,
    enforce four-choice menu contracts, and produce JavaScript plus
    RP2040/nRF52840 native builds.
24. **Controller-driven simulator regression test** — create a clean profile
    and verify 16 canvas states across Garage pagination, Settings,
    Accessibility, Back navigation, Drive, layout selection, and race launch.
25. **Race pause/restart lifecycle regression coverage** — drive grid and live
    pause, verify frozen clocks/player/rivals, navigate pause submenus, cancel
    or confirm restart/exit, and verify fresh grids plus Garage cleanup. Includes
    a fix for the GO banner surviving a scene switch when paused immediately
    after the countdown. Tests add no runtime code or extension dependencies.

## Player-Experience Impact

Impact uses a five-point scale, where 5 changes the minute-to-minute experience
or long-term motivation and 1 is mostly production safety.

| Rank | Feature | Impact | Player-facing effect |
| ---: | --- | :---: | --- |
| 1 | Championship season | 5/5 | Three linked events turn isolated races into a high-stakes endgame goal. |
| 2 | Fair race flow, route validation, and finish order | 5/5 | Winning and losing now have understandable, enforceable rules. |
| 3 | Reverse layouts | 5/5 | Every circuit gains a distinct line to learn and a separate record chase. |
| 4 | Deterministic named rivals and balance retune | 5/5 | Races become actual contests with learnable opponents. |
| 5 | Records, medals, and replay targets | 5/5 | Every layout has a durable reason to replay and improve. |
| 6 | Controller-native mastery abilities | 5/5 | Free Roam rewards become visible, usable powers instead of hidden keys. |
| 7 | Race HUD, warnings, countdown, and result breakdown | 5/5 | Critical state and feedback stay readable from grid to results. |
| 8 | Driving assists and presets | 4/5 | More players can find responsive handling without weakening the competition. |
| 9 | Pause, restart, rematch, and Garage flow | 4/5 | Recovery from mistakes is fast, safe, and controller-friendly. |
| 10 | Distinct mentor/statue art and driving effects | 4/5 | Activities and actions gain identity, motion, and reward presence. |
| 11 | Career milestones and Garage briefings | 4/5 | Progression goals and locked content are clear before committing. |
| 12 | Part comparison and economy changes | 4/5 | Purchases are informed and early progression has less dead time. |
| 13 | Save migration and compatibility protection | 4/5 | Existing players keep progress and newer saves are never destroyed. |
| 14 | Accessibility and presentation settings | 3/5 | More players can tune readability and sensory intensity. |
| 15 | Rival field cards | 3/5 | The grid has recognizable opponents before the countdown begins. |
| 16 | Native hardware compatibility | 3/5 | Essential controls and builds work beyond the browser simulator. |
| 17 | Asset/build/simulator validation | 2/5 | Players see fewer broken sprites, dead ends, or stale-build regressions. |
| 18 | Documentation and explicit design ownership | 1/5 | Future changes can preserve the same product standard. |

## Extension Decisions

- **Kept:** Arcade Storytelling because it remains the controller-native menu
  and cutscene layer used throughout the product.
- **Removed:** Arcade Minimap and Status Bar. The project used only a narrow
  portion of each package, so compact native tile rendering and a fixed-image
  durability sprite now provide the same player-facing behavior while keeping
  the expanded game inside the native compiler budget.
- **Removed:** Browser Events. Its J/K/L shortcuts were redundant after B-button
  ability selection and its keymap shim prevented physical-hardware builds.
- **Evaluated, not added:**
  [Arcade Mini Menu](https://arcade.makecode.com/pkg/riknoll/arcade-mini-menu)
  and [Arcade Fancy Text](https://github.com/riknoll/arcade-fancy-text).
  They are useful packages, but the current native image menus and `image.print`
  cover the required UI with a smaller memory and compatibility surface.
- **Not needed:** timer, animation, settings, sprite-data, and audio extensions.
  The game now has a pause-aware delta clock, bounded sprite effects, a
  versioned settings record, and native sound expressions.

## Art Direction and Provenance

The new cars are original 24x12 and 12x24 MakeCode-palette designs. Their scale,
top-down readability, and silhouette separation were informed by permissive
reference packs including Kenney's
[Pixel Vehicle Pack](https://kenney.nl/assets/pixel-vehicle-pack) and the CC0
[Cars Top Down View](https://opengameart.org/content/cars-top-down-view).
No reference sprite was copied into the project. The generator constructs every
pixel, encodes MakeCode's aligned column-major F4 layout, and preserves stable
JRES IDs.

## Hardware and Performance Boundary

- JavaScript/simulator build: supported.
- RP2040: supported and selected by `mkc.json` for native CLI builds.
- nRF52840 (`n4`): supported in the validated build matrix.
- nRF52833 (`n3`) and SAMD51: the complete game exceeds their flash budgets.
- HUD redraws are bounded, transient driving effects are capped at 18 sprites,
  and the ability HUD redraws only when its state signature changes. The 1.0
  RP2040 build reports 510,908 generated-code bytes; future features must
  preserve or deliberately re-budget that narrow native margin.

## Remaining Objects

These are deliberate next-release candidates, not blockers for the current
polish release:

1. Hands-on multi-run balance telemetry from real players for every upgrade
   tier, circuit, and medal target.
2. A 20–30 minute soak test on representative RP2040 and nRF52840 devices,
   including repeated Garage/race/Free Roam transitions.
3. Best-run ghost recording after recovering additional native code budget or
   defining a simulator-only feature profile.
4. Additional authored circuits using the same forward/reverse route-gate and
   AI-profile systems.
5. Full illustrated rival portraits beyond the compact native paint/name cards.
6. Translation of player-facing copy; dynamic fixed-width text is now safe,
   but the English source strings still need localization.
7. Extend the controller-driven smoke suite to finish, timeout, wreck,
   championship, full reverse-route completion, and save migration. Grid/live
   pause, restart/cancel, pause submenus, and Garage exit are now covered.
8. Release packaging: version tag, playable share link, screenshots/GIF, and a
   short hardware-support note for players.
