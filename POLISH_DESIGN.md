# MakeCode Racing Product Polish Design

This document records the product decisions behind the 0.9 polish pass, the
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

1. **Sound and camera-shake options** — route existing effects through
   persistent player preferences.
2. **High-contrast HUD option** — recolor race, ability, and durability UI.
3. **Driving-effects option** — allow skid, boost, blink, and impact feedback
   to be disabled instantly.
4. **Economy tune-up** — make tier-two parts and paint reachable earlier while
   keeping tier three aspirational.
5. **Pure vehicle-stat previews** — compare a candidate part against the
   equipped loadout before spending cash.
6. **Expanded Garage career screens** — surface completion, unlock milestones,
   lifetime stats, medals, records, and reset protection.
7. **Race briefing and medal labels** — show laps, rivals, prize, time limit,
   personal best, and Gold/Silver targets before launch.
8. **Reusable race HUD** — display lap, place, remaining time, last lap, and
   wrong-way feedback without allocating a new image every frame.
9. **Controller-native ability HUD and selector** — expose Boost, Blink, and
   Drift lock, ready, active, and cooldown states on every Free Roam map.
10. **Pause-safe race menu** — provide Resume, confirmed Restart, Controls,
    inline Settings, and confirmed Garage exit during the grid or live race.
11. **Result classification and reward breakdown** — distinguish finish,
    timeout, and wreck; show place, fastest lap, medal, records, durability,
    prize, placement, clean, and time bonuses.
12. **Persistent records and safe save migration** — migrate version-one
    careers, store per-circuit race/lap/finish records, and protect unknown or
    incomplete saves from writes.
13. **Ordered route progress** — require every authored gate in sequence,
    diagnose wrong-way travel, calculate live position, and reject shortcuts.
14. **Deterministic rival profiles** — give named drivers stable acceleration,
    steering, cornering, recovery, avoidance, art, and real finish order.
15. **Retuned event simulation** — align route length, AI capture radius,
    rival pace, time limits, and medal targets so all three events can be
    completed and contested.
16. **MakeCode-native mastery art** — generate three Forest cars in four
    directions, three Highway mentors, three Cave stone racers, pedestals,
    altar, ability icons, and trophy art as validated column-major F4 assets.
17. **Mastery-world integration** — stream the correct art at deterministic
    activity sites, preserve completion badges and carried statues, unlock and
    auto-select abilities, and keep map discoveries/save state coherent.
18. **Hardware-oriented release tooling** — validate every JRES payload against
    generated bindings, use MakeCode's own emitter as a headless fallback, and
    produce JavaScript plus RP2040/nRF52840 native builds.

## Player-Experience Impact

Impact uses a five-point scale, where 5 changes the minute-to-minute experience
or long-term motivation and 1 is mostly production safety.

| Rank | Feature | Impact | Player-facing effect |
| ---: | --- | :---: | --- |
| 1 | Fair race flow, route validation, and finish order | 5/5 | Winning and losing now have understandable, enforceable rules. |
| 2 | Deterministic named rivals and balance retune | 5/5 | Races become actual contests with learnable opponents. |
| 3 | Records, medals, and replay targets | 5/5 | Every circuit has a durable reason to replay and improve. |
| 4 | Controller-native mastery abilities | 5/5 | Free Roam rewards become visible, usable powers instead of hidden keys. |
| 5 | Race HUD, warnings, countdown, and result breakdown | 5/5 | Critical state and feedback stay readable from grid to results. |
| 6 | Pause, restart, rematch, and Garage flow | 4/5 | Recovery from mistakes is fast, safe, and controller-friendly. |
| 7 | Distinct mentor/statue art and driving effects | 4/5 | Activities and actions gain identity, motion, and reward presence. |
| 8 | Career milestones and Garage briefings | 4/5 | Progression goals and locked content are clear before committing. |
| 9 | Part comparison and economy changes | 4/5 | Purchases are informed and early progression has less dead time. |
| 10 | Save migration and compatibility protection | 4/5 | Existing players keep progress and newer saves are never destroyed. |
| 11 | Accessibility and presentation settings | 3/5 | More players can tune readability and sensory intensity. |
| 12 | Native hardware compatibility | 3/5 | Essential controls and builds work beyond the browser simulator. |
| 13 | Asset/build validation tools | 2/5 | Players see fewer broken sprites or stale-build regressions. |
| 14 | Documentation and explicit design ownership | 1/5 | Future changes can preserve the same product standard. |

## Extension Decisions

- **Kept:** Arcade Storytelling, Arcade Minimap, and Status Bar because they
  already serve core menus, race navigation, and durability.
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
  and the ability HUD redraws only when its state signature changes.

## Remaining Objects

These are deliberate next-release candidates, not blockers for the current
polish release:

1. Hands-on multi-run balance telemetry from real players for every upgrade
   tier, circuit, and medal target.
2. A 20–30 minute soak test on representative RP2040 and nRF52840 devices,
   including repeated Garage/race/Free Roam transitions.
3. Best-run ghost recording with a tightly bounded sample buffer.
4. A three-event championship series with points and a final podium.
5. Additional authored circuits or reverse layouts using the same route-gate
   and AI-profile systems.
6. Per-rival portrait/badge art and a pre-grid field card.
7. Optional steering/braking assists and independent difficulty presets.
8. Localization-safe UI copy and a text-width audit for translated strings.
9. Automated controller-driven simulator smoke tests for menus, pause, restart,
   finish, timeout, wreck, and save migration.
10. Release packaging: version tag, playable share link, screenshots/GIF, and a
    short hardware-support note for players.

