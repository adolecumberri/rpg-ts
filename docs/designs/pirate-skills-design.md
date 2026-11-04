# Pirate Job — System Support Design (v3)

* **Author:** Lead (EGM draft, Revision v2 + Goldfish synthesis v2)
* **Date:** 2026-11-03
* **Status:** implementation-ready for the P1 slice; growth values deferred

## 1. Scope

The signed-off Pirate skills are **Knife Mastery** (passive), **Disarm**
(active), **Escorbuto** (active debuff) and **Crew** (passive). None has growth
values, and the four skills do not have a final ladder yet. This design enables
the four skills with the smallest system surface and defers the rest.

Ship in this branch:
1 battle lifecycle/teardown + status cleanup;
2 battle-start passives with team context;
3 Crew X team status with recompute;
4 Disarm detach/restore;
5 knife weapon type + mastery proficiency/reward;
6 Escorbuto debuff status + skill data;
7 Pirate job (4-skill ladder, `maxLevel 1` for now) and `ALL_JOBS` entry;
8 tests for each invariant.

Deferred: channel/action-lock, multi-target attack pipeline, `statusForTarget`,
stun repair, rank scaffolding (all four skills stay maxLevel 1), growth values,
discovery mission wiring, IntervalCombat parity.

## 2. Battle lifecycle and teardown (P1)

Today: `clearStatuses` (worldTest/core/statuses.ts) has no production caller;
`Session.finishCombat` never clears statuses or restores equipment; the real
driver (`CombatScreen`) never calls `HybridCombat.next()`, so an `end` event
cannot be the teardown trigger.

Design:
- `HybridCombat` owns a **teardown registry**: `dispose(): void` (idempotent)
  which (a) calls `clearStatuses(character, { keepPersistent: true })` for every
  combatant, (b) runs every registered restore callback, (c) empties the
  registry. The status cleanup keeps `persistent` statuses (Corpse Carrying).
- `HybridCombat` gains `registerBattleRestore(callback)`; systems that detach
  gear use it.
- Every battle driver calls `dispose()` exactly once when the battle ends:
  `web/src/screens/combat/CombatScreen.tsx` (settle path, win/lost/fled),
  `web/src/screens/dev/StressFightScreen.tsx`,
  `web/src/screens/dev/RogueliteScreen.tsx`.
- `Session.finishCombat` (session.ts:1518) runs `clearStatuses` over its
  `participants`/`fighters`/team as a **safety net** before the existing
  won/lost/fled branches, so a driver that forgot `dispose()` cannot leak
  statuses into the world. Equipment restore remains the combat's job.
- `HybridEndEvent` stays for dev drivers; production does not depend on it.

## 3. Status clock and new status fields (P1)

HybridCombat fires `on_turn` at the start of the bearer's action (added in this
branch) and also `after_attack` and `after_turn`; the latter fires for the
attacker and the defender of an action. Rules for new statuses:
- Per-turn statuses may use `applyOn: 'on_turn'` now; use `after_turn` plus
  `triggersOnAdd: true` when a stat effect must exist from application.
- Permanent statuses used as markers (Crew) do not tick.
- "Turns" in descriptions mean the bearer's actions; tooltips say "actions".
- Mana regenerates after the faint/stun gates, so a skipped turn regenerates
  nothing.
New fields live in the worldTest augmentation (`config/damage.ts`), not in the
library: `crew?: { jobId: string; attackPerMember: number }` and the mastery
config on `SkillSpec`; no damage-multiplier status field.
needed. No `blocksSkills`/`manaRegenBonus` in this branch.

## 4. Crew (P1)

Crew is a **passive skill** (`crew`, passive) on the Pirate ladder. At battle
start, after `this.combatants` is assigned, the engine:
1. finds every passive spec with `crew` config among both sides;
2. counts living combatants on the holder's side whose `character.jobId`
   equals `crew.jobId` (the Pirate);
3. applies a permanent positive status `Crew X` (name unique per source) to each
   of those combatants, with `attack + X * crew.attackPerMember` as a
   `BUFF_FIXED` modifier;
4. re-syncs after every action: if X changed, remove the previous `Crew X`
   status and apply the new one (do **not** rely on `syncAuras`, which adds only
   missing names and applies to all teammates).
Membership rule: a character is Crew when `hasPassive(character, 'crew')` is
true in any of the four passive places: the held job ladder, the second job
ladder, passive slot 1 or passive slot 2. No separate marker status is needed.
X counts living combatants of the side whose held job is the crew job
(Pirates); fainted combatants are excluded. Count scope: living combatants of
the side (includes allied NPCs present in the battle, not just the session
team). Passive slots are stored on the character (`passiveSlots`, saved with
the character), and their skills join `availableSkillIds` so battle-start
passives apply from any of the four places.

## 5. Disarm (P1)

New skill id `disarm_weapon` (display "Weapon Disarm") to avoid the existing
`disarm` id and status name (StatusManager replaces same-name statuses).
`SkillSpec.disarmWeapon?: true`.

Resolution (engine, after the skill effect):
1. pick the target's primary weapon: the lowest weapon hole in the loadout,
   else the legacy weapon slot; weaponless targets are unaffected (cost is still
   spent);
2. detach it with `unequipHole` (never `unequipToInventory`), recording
   `{ characterId, container: 'hole' | 'legacy', hole?, item }`;
3. register a restore callback in the combat teardown registry;
4. restore in `dispose()` with the inverse container: `equipInto` for a hole,
   the legacy equipment manager for the legacy slot. The item never enters the
   inventory; ownership counters are untouched; HP clamps if a total-HP-granting
   weapon is removed.
No save can occur between detach and restore in the current flow; the restore
must also run on win/lost/fled (single `dispose()` path).

## 6. Knife and Knife Mastery (P1)

- Add `knife` to `WEAPON_TYPES` (constants/weaponTypes.ts), the `WeaponType`
  union in `jobs/Job.ts` and the config augmentation, the equipment sections
  (`EquipmentSection`, `sectionOfItem`), and the item table section.
- The Pirate job lists `knife` in `weaponTypes`; equippability stays a job
  allowlist (`allowsWeapon`, `canEquipItem`), not a passive effect.
- **Knife Mastery** is an X-mastery passive (the model for future weapon
  masteries). It does two things:
  1. **Proficiency:** `mastery.proficiency` widens the weapon allowlist, so a
     job that normally refuses knives may equip them.
  2. **Reward:** `mastery.status` is a battle-start status applied only while the
     matching weapon type is in an equipped hole (for now +5 attack with a
     knife). The status is a normal stat status; there is no damage-multiplier
     hook in the attack resolver.
- Name the passive definition `knife_mastery`; `maxLevel 1` until growth.

## 7. Escorbuto (P1, content)

First version is a **stat debuff**, no DoT: `statusOnTargets` applying a
negative permanent-or-temporal status (e.g. `Scorbuto`: defence and accuracy
down for N actions) to enemies; `targeting: 'ENEMY'`, `numberOfTargets` 1, mana
cost, `maxLevel 1`. A damage-over-time version needs a per-turn effect system
that does not exist; it is documented as a later upgrade.

## 8. Enhancement and rank deferral

All four skills ship with `maxLevel 1`: `enhanceableSkillsOf` will not offer
picks for them (it caps at `min(plan.maxLevel, definition.maxLevel)`), and no
RAW_SKILLS rank entries / RANK_FAMILIES rows are added yet. When growth values
are defined, each enhancable skill needs its rank entries registered (otherwise
`resolveSkill` clamps to level 1 and picks are spent with no effect). This is a
known, documented follow-up.

## 9. Pirate job data (P1)

`constants/jobs/PirateJob.ts`: id `pirate`, title `Pirate`, weaponTypes
`[knife]`, statBonuses (placeholders), canShield false, growth placeholder,
progression: skills at levels 1 (`knife_mastery` passive, `disarm_weapon`),
3 (`escorbuto`), 5 (`crew` passive), `enhancementAt [2,4,6,7]`, masteryTitle.
`unlock`: `knownBy: FLAGS.PIRATE_KNOWN` once the flag exists; until the
discovery mission is written, the job is registered in `ALL_JOBS` with the
`knownBy` flag and the dev tools can set it. The job is not offered by the
Oficio until visible (`jobUnlockState` already filters by flag).

## 10. Files and order

1. `worldTest/core/statuses.ts` + `config/damage.ts`: augmentation fields,
   `clearStatuses` wiring, status factories (`crewStatus`, `knifeMasteryStatus`,
   `scorbutoStatus`).
2. `worldTest/core/combat/hybridCombat.ts`: teardown registry + `dispose()`,
   passives after combatants, Crew sync, Disarm resolution/restore.
3. `worldTest/core/session.ts`: `finishCombat` status safety net.
4. `web/src/screens/combat/CombatScreen.tsx`, dev screens: call `dispose()`.
5. `worldTest/core/constants/weaponTypes.ts`, `jobs/Job.ts`, equipment/inventory
   section, item table, `PirateJob.ts`, `constants/jobs/index.ts`.
6. `worldTest/web` job page: knife section/meta only if the UI enumerates
   weapon types.
7. Tests: lifecycle, Crew X recompute, disarm restore on win/lost/flee, knife
   damage bonus, status cleanup keeps persistent.

## 11. Tests

- `dispose()` clears all non-persistent statuses and is idempotent.
- Crew: 2 Pirates give Crew +6 attack each; one dies → +3; no Pirates → none.
- Disarm: weapon removed from stats, restored after win/lost/flee, inventory
  counts unchanged, weaponless target unaffected.
- Knife Mastery: knife becomes equippable and grants +5 attack while equipped; bow unchanged.
- Escorbuto: debuff applied to enemy, expires/cleans at battle end.
- `finishCombat` clears leaked statuses even if a driver skipped `dispose()`.

## 12. Open decisions

- Pirate stat bonuses/growth and skill growth values (balance pass later).
- Discovery mission flag name/content.
- Whether Escorbuto becomes a DoT (needs the per-turn status effect system).
- Channel and multi-target attack: next system branch, not this one.
