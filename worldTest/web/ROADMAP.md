# Roadmap — rpg-ts web app

Plan of the next feature batches. Review this and approve / adjust before we implement.

## Status

- ✅ **Step 1 — 3-layer restructure + shop/inventory fixes + unit tests (done)**
  - `worldTest/core/` owns the feature logic (items, shop, statuses, skills, world, session); the web only renders.
  - Library: item categories + `isEquippableCategory`, inventory stacks with *owned vs available* counts.
  - Shop sections per category; buy/equip/sell semantics fixed.
  - Unit tests: `test/inventoryStacking.test.ts`, `test/shop.test.ts` (56 tests green).
- ✅ **1. Loot & drop tables (done)** — `ItemTable` (data-driven item catalog), `DropTable`, `LootRoller` with injectable randomness; NPCs/bandits drop loot on victory and the victory screen shows it. Tests: `test/loot.test.ts` (66 tests green).
- ✅ **2. Special encounters (done)** — `EncounterTracker` counts victories per place; `SPECIAL_ENCOUNTERS` spawn special NPCs after X victories (`once` / `every`). Grunt NPCs now respawn so encounters can repeat. Example: Goblin Chief after 3 forest wins; Arena Champion every 2 training wins. Tests: `test/specialEncounter.test.ts` (72 tests green).
- ✅ **3. Elemental & compound damage (done)** — `worldTest/core/damage/`: `ElementRegistry`, `DamageComposer` (components × defence layers → one final value, `breakdown` flag), character helpers. Items carry `elements` (attack/resistance); skills are now specs resolved through the composer; combat has a 🧮 Breakdown toggle. Tests: `test/compoundDamage.test.ts` (81 tests green).
- ✅ **4. Skill trees (done)** — `worldTest/core/skillTree/`: `SkillNode` + `SkillTree` (per-character learned state) and pluggable `UnlockCondition`s (level, stat, status, previous node, item, quest flag). `WorldSession.unlockNode` applies bonuses/granted skills; hero/companion trees included; new 🌳 Skill Tree screen on the character page. Tests: `test/skillTree.test.ts` (89 tests green).
- ✅ **5. Visualization tools (done)** — `worldTest/core/view/`: travel graph builder (nodes/edges, locked flags), skill-tree view (learned/unlockable + previous-node edges), drop-table view (chance + qty rows, all creatures). Web: 🗺️ World Map screen (tap to travel), SVG skill tree diagram, 🎲 Loot Tables screen. Tests: `test/viewTools.test.ts` (94 tests green).

> **All roadmap steps are implemented.** Next up: feedback-driven polish and more unit tests.

## 1. Loot & drop tables

**Goal:** creatures drop items on defeat, and the item table is user-creatable (data, not code).

- `ItemTable` registry: item definitions as data (`id, name, category, stats/effects, buy/sell value`) instead of hardcoded factories.
- `DropTable`: per-creature list of entries `{ itemId, weight, minQty, maxQty }`.
- `LootRoller`: rolls weighted entries on victory, grants items to the team inventory; gold/XP stay separate.
- `NPC` type gains `dropTable?: DropTable`.
- UI: victory screen shows the loot roll.
- Files: `src/game/loot/ItemTable.ts`, `src/game/loot/DropTable.ts`, `src/game/loot/LootRoller.ts`.

## 2. Escalating / special encounters

**Goal:** a location where, after X encounters, a special enemy with special stats appears.

- `EncounterTracker` per place: counts victories in that place.
- `SpecialEncounter`: template creature + stat multipliers + special statuses; spawns when the threshold is reached; reset policy configurable (once / repeat every X).
- Example: Whispering Forest — after 3 goblin fights, the **Goblin Chief** appears (bigger stats, applies Burn).
- Files: `src/game/world/EncounterTracker.ts`, `src/game/world/SpecialEncounter.ts`.

## 3. Elemental & compound damage

**Goal:** damage is a compound of multiple components; defence is also computed from multiple components; the final value is a single digit by default, with an optional breakdown flag.

- `Element` registry (`fire`, `ice`, `lightning`, `poison`, …); items/characters carry per-element attack and defence values.
- `DamageComponent` interface: each component contributes a value (physical, per-element, buffs, crit).
- `DamageComposer` sums components; `DefenceComposer` reduces each component using the defender's per-element resistances.
- Final value: **one number** by default; `showBreakdown: boolean` flag renders the multi-digit breakdown in the UI.
- Prototype in the web layer first; promote to the library (`src/`) once stable.
- Files: `src/game/damage/ElementRegistry.ts`, `src/game/damage/DamageComposer.ts`, `src/game/damage/DefenceComposer.ts`, `src/game/damage/components/*`.

## 4. Skill trees

**Goal:** units have a skill tree; the user sets the unlock conditions for each node.

- `SkillNode { id, skill, conditions: UnlockCondition[] }`.
- `UnlockCondition` interface with implementations: level, stat threshold, active status, previous node unlocked, item owned, quest flag.
- `SkillTree` per unit/class; `UnlockEvaluator` evaluates conditions against a character + world context.
- Files: `src/game/skills/SkillNode.ts`, `src/game/skills/SkillTree.ts`, `src/game/skills/conditions/*`.

## 5. Architecture notes (SOLID)

- One responsibility per file: data / registries / resolvers / UI components.
- Interfaces everywhere: `IEffect`, `IDamageComponent`, `IUnlockCondition`, `IDropSource`.
- The library (`src/`) stays the engine core (Character, Stats, Statuses, Combat, World); game-specific systems live in the web app first and are promoted to the library when stable.
- Suggested implementation order: **1 → 2 → 3 → 4** (each one builds on the previous).
