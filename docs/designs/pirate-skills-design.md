# Pirate Job — Skills Design (Draft v2)

* **Author:** Lead (EGM draft, after Goldfish brainstorm review)
* **Date:** 2026-11-03
* **Status:** draft resolved against `pirate-skills-brief.md` reviews
* **Inputs:** `docs/designs/pirate-skills-brief.md`

## 1. Summary and Scope Decisions

The eight requested skills were checked against the engine. The review changed
the plan: two engine prerequisites are missing today (battle-end cleanup and a
working stun), and several skills depend on mechanics that do not exist yet.
The first Pirate ladder therefore ships four skills after the prerequisites,
with the heavy mechanics staged behind them.

**Decisions**
- The first Pirate ladder has four skills (matching the existing three jobs):
  **Lateral Swing** (L1), **Silence** (L1), **Eter Syphon** (L3),
  **Blunt Edge** (L5, passive). Eter Syphon and Blunt Edge require the
  prerequisites below.
- **Dispel** is not new content: it already exists (`dispel`, worldTest/core/
  skills.ts) but no ladder teaches it. Wire it into the Healer ladder and fix
  its auto-policy/mana cost instead of duplicating it.
- **Mana Flow** is a passive for a caster job (Healer or a future caster job),
  not the Pirate; it is in the first wave of engine support but not the Pirate
  ladder.
- **Disarm** is re-themed for now: a weapon-disable status (remove the item's
  stat modifier source, restore on status removal) instead of detaching the
  item from the loadout. True unequip waits for the battle teardown.
- **Crew** is deferred: a live count of Pirates cannot be expressed with the
  current aura system, and stacking four Pirates conflicts with the job-mixing
  ladder rules.
- **Cuff** (a "Crew" team buff) is out of this draft; it needs a dynamic aura
  value and a team-wide passive hook.

## 2. Goals and Non-Goals

**Goals**
- Correct the two engine holes that block control/persistent effects.
- Add the four first-wave skills as leveled catalog data with tests.
- Keep the changes inside existing owners: `worldTest/core/skills.ts`,
  `statuses.ts`, `config/damage.ts` augmentation, `combat/hybridCombat.ts`,
  `combat/skillEffects.ts`, `combat/skillGating.ts`, `combat/aura.ts`,
  `jobs/`, `save/` (no format change).
- Make every duration visible and countable in actions, not rounds.

**Non-Goals**
- Balance numbers (X, %, costs) — placeholders in this draft.
- Pirate discovery mission content (only the unlock flag contract).
- True weapon removal from the loadout (deferred).
- Dynamic team-composition auras (deferred).
- IntervalCombat parity for mana regen; the shipped game uses HybridCombat.

## 3. Prerequisites (P0, before the first skill)

### P0.1 Battle teardown and status cleanup
`HybridCombat.next()` only returns an end event. `Session.finishCombat`
(`session.ts:1518`) never clears statuses; `clearStatuses`
(`statuses.ts:454`) is test-only. Consequences today: any status applied by a
skill survives on a persistent party character after the fight, and a detach
strategy would lose items on flee/defeat.

Fix: a `completed`/teardown hook in the combat engine (idempotent) that calls
`clearStatuses` on every combatant and runs registered cleanup callbacks
(equipment restore later). `finishCombat` calls it before its won/lost/fled
branches, and every UI/dev driver that owns the battle (CombatScreen, dev
screens) must call the same path.

### P0.2 Repair the stun status
`stunStatus` (`statuses.ts`) is `applyOn: 'after_turn'`, ONCE, duration 1; the
same `after_turn` trigger pass cleans it before `consumeStunTurn` sees it, so
Shield Bash's stun is dead. Fix: make stun expire on the bearer's own action
(the engine's turn-start check), add a test that a stunned fighter loses one
action, then build Blunt Edge on top.

### P0.3 Status flags in the worldTest augmentation
New flags (`blocksSkills`, `blocksActions`, `manaRegenBonus`, `disarmWeapon`
markers, `persistent`) belong in `config/damage.ts`'s `declare module` block,
where `polarity`, `aura` and `grantsSkills` already live. The library
`StatusDefinition` stays generic.

### P0.4 Per-cast status factory
`SkillSpec.statusOnTargets` is a static `StatusDefinition`. Eter Syphon needs a
definition built at cast time that captures the caster. Add
`statusForTarget?: (actor: Character, target: Character) => StatusDefinition`
and use it in `resolveSkillEffect` in place of the static status when present.

### P0.5 Action-owner duration model
The hybrid engine triggers `after_turn` on both attacker and defender of every
action, so a status using `after_turn` can tick multiple times per round.
Silence, the Eter Syphon drain and the channel must decrement on the **bearer's
own action only** (a new per-turn check in `actOnce`), and tooltips must say
"actions", not "turns". Add a duration owner in the turn loop
(`consumeActionTurn(status)`), mirroring the faint/stun consumption.

### P0.6 Engine-side target validation for multi-target skills
`resolveManualSkill` only validates "living fighter in this battle", so a
manual cast can pass an ally or the same target twice for an `ENEMY` skill.
Validate against the spec's `targeting`/side, drop duplicates and reject ally
targets before resolving.

### P0.7 Ladder rank registration
`enhanceableSkillsOf` caps a skill at `plan.maxLevel ?? definition.maxLevel`;
skills absent from `RANK_FAMILIES` are maxLevel 1 and cannot spend enhancement
picks. Every ladder skill needs its RAW_SKILLS rank entries and a
`RANK_FAMILIES` row (or the rank factory from the structural review).

## 4. First Wave — Skill Specifications

| Skill | Kind | Target | Cost | Levels | Effect |
|---|---|---|---|---|---|
| `lateral_swing` | active | `ENEMY`, `numberOfTargets: X` | hp? | 3 | Player-cast wide swing: hits `min(X, living enemies)` distinct enemies, never allies. Damage via `damageFor` from `attack`; no weapon `onAttack` hooks, no impact/crit pipeline (documented limit). |
| `silence` | active | `ENEMY`, 1 | mana | 3 | Applies `Silenced` for X of the bearer's actions: no skills; passives unaffected; basic attack still available. |
| `eter_syphon` | active | `ENEMY`, 1 | mana | 3 | Applies `Syphon` (X actions, `statusForTarget` closure holding the caster) and `Channeling` (X actions, `blocksActions`) to the caster. Each bearer action: transfer Y hp and Z mana from enemy to caster; ends early if either dies. |
| `blunt_edge` | passive | self | — | 1 (not enhancable) | On-hit proc: when a hit lands, roll the combat's `random`; on success apply the (repaired) stun to the defender. Uses `ImpactProc.onTrigger(ctx)` with `ctx.random`; no new chance field. |

Durations: `X` = base + step × (skill level − 1); values live in
`SkillDefinition.levels`. The statuses use the new action-owner decay (P0.5).

**Dispel** (Healer ladder): keep the existing `dispel` spec id; add its three
rank entries and `RANK_FAMILIES` row so it can be levelled. Add `manaCost`
(today it is free, so manual casting is unlimited). Fix its auto-policy so it
can target enemies as well as allies (today `pickSkillTargets` returns only the
policy side for `ANY`). Note: `syncAuras` re-adds positive aura effects each
action, so dispelling an aura looks like nothing happened; treat that as an
explicit rule (auras are not dispellable; only timed statuses are). Passives
implemented as positive statuses would be stripped; prefer `persistent` statuses
for passives.

**Mana Flow** (caster passive): new `manaRegenBonus` in the status augmentation;
`HybridCombat.actOnce` sums it at turn start (`hybridCombat.ts:317-320`) and
clamps to total. It works only in HybridCombat; IntervalCombat has no mana path
— state that limit in the skill description.

## 5. Second Wave — Deferred Mechanics

- **Blunt Edge** waits for P0.2 (stun). Its passive proc already fits
  `ImpactProc.moment: 'hit'`; impacts only run through `resolveGeneralAttack`,
  so the passive does nothing for skills that never use that pipeline.
- **Eter Syphon** waits for P0.4 + P0.5 + P0.1.
- **Disarm** (re-themed now): a status whose `onAdd` removes the weapon's stat
  modifier source and whose `onRemove` restores it, self-cleaning with the
  battle teardown. Name it `weapon_bind`/`broken_grip` to avoid colliding with
  the existing `disarm`/`disarmStatus` (attack −40%, taught by Soldier Lv.1).
  True loadout unequip is a later feature; it needs a deterministic "primary
  weapon" rule (five unordered holes, no hand concept) and restore-on-end.
- **Crew** is deferred: it needs a Pirate job, a live count of living Pirates,
  an aura that re-emits when the count changes (`syncAuras` currently skips
  existing names, `aura.ts:83-89`), a team-wide passive hook (passives are
  applied in the constructor before `this.combatants` exists), and a decision on
  whether "Crew" membership is the job or a status.

## 6. Data Model Changes

- `worldTest/core/skills.ts`: `lateral_swing`, `silence`, `eter_syphon`,
  `blunt_edge` definitions + rank entries; `dispel` rank entries; new
  `SkillSpec.statusForTarget` for per-cast statuses.
- `worldTest/core/config/damage.ts`: status augmentation fields `blocksSkills`,
  `blocksActions`, `manaRegenBonus`, `persistent`.
- `worldTest/core/constants/jobs/PirateJob.ts`: four-skill ladder
  (`lateral_swing` 1, `silence` 1, `eter_syphon` 3, `blunt_edge` 5 passive),
  `enhancementAt [2,4,6,7]`, `masteryTitle`, and `unlock`:
  `knownBy: FLAGS.PIRATE_KNOWN`, `requirements: [{ kind: 'jobLevel', jobId:
  <a base job>, level: (owner decision) }]`. Add it to `ALL_JOBS`.
- Healer ladder: add `dispel` at the appropriate level (owner choice) instead
  of duplicating the skill.

## 7. Engine Changes by Owner

- `combat/hybridCombat.ts`: battle teardown hook; action-owner status decay;
  `blocksSkills` filter in `skillsOf` (covers menu, prompt and planner);
  `blocksActions` skip in `actOnce`; mana-regen bonus; disarm-status self-clean
  via teardown.
- `combat/skillGating.ts`: single gating entry point for silence checks
  (`canCastSkill`), used by UI, manual and auto.
- `combat/skillEffects.ts`: `statusForTarget` and the re-themed disarm status.
- `combat/autoSkills.ts`: multi-target policy for Lateral Swing; no silenced
  skills in the plan.
- `combat/aura.ts`: leave unchanged in wave one; wave two must re-emit effects
  when the computed value changes.
- `session.ts` (`finishCombat`): clear statuses and run cleanup before its
  won/lost/fled returns; shared by all battle drivers.
- `skills.ts`: `battleSkillSpecs` is the filter point for passive/blocked
  skills; rank registration for every ladder skill.
- `web/src/components/battle/JrpgArena.tsx`: silenced state in the skill list;
  multi-target selection UI for Lateral Swing; status chips must show
  "actions".

## 8. Save and Compatibility

- No `SAVE_VERSION` change. Statuses and battle-scoped state are not saved;
  the new teardown guarantees they do not leak between battles.
- Existing jobs and saves load unchanged. Adding `dispel` ranks is additive.
- A mastered job with a freshly added ladder skill starts it at rank 1 with no
  pending pick (existing rule); it can be enhanced only through later picks.
  Document that new ladder entries will look unenhanced on old mastered jobs.

## 9. Testing

- Stun: a stunned fighter loses exactly one action; Shield Bash applies it.
- Teardown: silence and drain statuses are gone after win, loss and flee.
- Silence: menus/prompt/planner hide skills; attack and passives still work.
- Eter Syphon: one drain per bearer action; caster locked; death ends it;
  dispel of the channel clears the drain.
- Lateral Swing: no allies, no duplicate targets, min(X, enemies); damage
  scaled from attack; no impact procs.
- Mana Flow: regen base + N, clamped; no effect in interval battles (documented).
- Dispel: strips timed buffs/debuffs on the right side; auras unaffected by rule;
  has a mana cost; auto policy can pick enemies and allies.
- Weapon disable: the attack drop is restored at battle end; inventory counts
  unchanged.

## 10. Staging

0. Prerequisites P0.1–P0.7 (engine + tests).
1. Content: lateral_swing, silence, mana_flow, dispel + Healer ladder wiring.
2. Content: eter_syphon after P0.4/P0.5; blunt_edge after P0.2.
3. Pirate job data + unlock flag + first ladder integration.
4. Second wave: weapon bind (Disarm), Crew research (job + dynamic aura).

## 11. Risks and Open Questions (owner decisions)

- Does the Pirate ladder include Eter Syphon and Blunt Edge at launch, or ship
  only Lateral Swing + Silence first?
- Which job levels gate the Pirate unlock (`jobLevel` on which base job, at what
  level), and which mission sets `PIRATE_KNOWN`?
- Is Dispel's home the Healer ladder (recommended by review) or a shared skill?
- Weapon disable vs true unequip final scope; true unequip needs the teardown
  and a primary-weapon rule.
- Should passives be `persistent` (not dispellable) by default?
