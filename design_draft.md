# Barrier and Healing Mechanics

* **Author:** Lead
* **Status:** Draft
* **Date:** 2026-11-09

--------------------------------------------------------------------------------

## Overview

Combat currently has one life resource, HP, and damage and healing are applied
directly in several places. There is no temporary damage buffer, no way to heal
from damage dealt or received, no turn-start regeneration, and no way to reduce
incoming healing. Adding those mechanics one at a time would spread the same
ordering rules across the hybrid engine, the legacy interval engine, skill
resolution, cover, statuses and damage-over-time effects.

This design introduces a **barrier** (a temporary pool that absorbs damage
before HP) and four life-manipulation stats: **lifesteal**, **absorption**,
**regen** and **healing reduction** (the mechanic behind Herida grave). It also
introduces one shared damage/healing transaction that both combat engines use.
The barrier is a grey bar separate from HP; the offhand shield item keeps its
existing name and meaning.

The work is staged so each slice can ship and be tested on its own:

1. barrier, damage application and the grey bar;
2. shared healing, regen and healing reduction;
3. lifesteal with on-hit damage provenance;
4. absorption.

## The Problem

The current combat model has one HP number. Damage is resolved in several
places and applied directly to `stats.hp`: the hybrid engine, the legacy interval
engine, `resolveSkillEffect`, cover redirects and status damage. Healing is the
same: skill effects, status triggers and the legacy `healSelf` path all mutate HP.
There is no single place where a hit can ask “did this land?”, “how much did the
barrier absorb?”, “how much HP was actually lost?” and “what healing follows from
that?”.

That matters for this feature because every new mechanic depends on the same
ordering:

* a barrier must absorb before HP and know how much it absorbed;
* lifesteal must know which part of the damage was on-hit physical damage;
* absorption must know the damage received, including barrier-absorbed damage;
* regen and all healing must be reduced by Herida grave;
* a lethal hit must skip absorption but still count as damage for the parts that
  happen before death.

Without a shared transaction, each engine and each call site would grow its own
version of this order. The result would be different behaviour in the hybrid and
legacy engines, double-counted healing, and barrier state that leaks between
battles.

The player-facing problem is narrower: combat lacks a defensive layer that can be
granted by skills and items, and lacks build options that convert damage into
sustained life. Those options are expected to interact, so they need one rules
owner rather than four independent patches.

## Goals

* Add a **barrier** pool that absorbs damage before HP, stacks into one pool,
  expires after 2 turns and resets its timer on any positive grant.
* Show the barrier as a separate grey bar so the player can see the pool and its
  disappearance without confusing it with HP.
* Add a single damage transaction that computes, in order: barrier absorption,
  HP damage, lethality, lifesteal and absorption, with one rounding point.
* Add a single healing transaction that applies healing reduction, caps at max
  HP, and is used by direct heals, regen, lifesteal and absorption.
* Add `lifestealPercent`, `absorptionPercent`, `regenPercent`,
  `healingReductionPercent` and `barrierGainReductionPercent` as Character stats
  seeded at 0.
* Make lifesteal heal only from on-hit physical damage, including
  barrier-absorbed and overkill damage.
* Make absorption heal from all post-mitigation damage received, including
  barrier-absorbed damage, but never on a lethal hit.
* Make regen heal a percentage of max HP at turn start after status cleanup,
  while stunned but not while fainted.
* Make Herida grave a cleansable status that reduces all healing received;
  latest application wins and barrier is unaffected.
* Use the same transaction from both the hybrid and the legacy interval engine.
* Keep HP integer; sum fractional damage/healing inside a transaction and round
  once at the final HP write.
* Ship in the four stages listed in the Overview.

## Non-Goals

* Omnivamp for magic or true damage. Lifesteal covers on-hit physical damage
  only; magic/true lifesteal is a later stat.
* Balance values, final percentages, durations, mana costs or content design.
  The design defines hooks and test values, not shipped numbers.
* Changing the existing elemental affinity, mitigation or critical-hit rules.
* Persisting barrier state between battles. Barrier is battle-scoped.
* New status content beyond what is needed to test barrier grants, Broken
  Barrier, Herida grave, regen and the damage/healing hooks.
* Rewriting the legacy interval engine. It only receives an adapter to the
  shared application functions; its turn scheduler and combat loop stay as they
  are.
* Animations, particles or combat-log redesign beyond the minimum label needed
  to distinguish barrier absorption and reduced healing.
* A general event bus. The transaction returns a record; callers and trackers
  consume that record directly.
* A new save-game version. The new stats default to 0 and existing saves keep
  working.

--------------------------------------------------------------------------------

## Technical Plan (Architecture)

### 1. Rules owner and shared application layer

The rules live in one new library module, `src/classes/Combat/Vitals.ts`, not in
either combat engine. Both the worldTest hybrid engine and the legacy
`IntervalCombat` import it from the same package. This avoids a callback adapter
and keeps barrier, damage and healing rules identical in both engines.

```text
worldTest/core/damage/general.ts ──┐
worldTest/core/combat/skillEffects.ts ──┤
worldTest/core/statuses.ts ────────┼──> src/classes/Combat/Vitals.ts
src/classes/Combat/IntervalCombat.ts ──┤      (applyDamage / applyHeal /
worldTest/core/combat/hybridCombat.ts ─┘       grantBarrier / tickBarrier)
```

The damage resolver keeps doing what it already does: affinity, mitigation,
crits, reactions, cover, accuracy and evasion. It stops writing HP and returns
**recipes**: post-mitigation component amounts plus provenance. `Vitals` is the
only code that writes HP for damage and healing.

The library module is not allowed to import from `worldTest`. Its inputs are
plain numbers and Character references; worldTest builds the recipes.

### 2. Data model

`Character` gains one battle-scoped field:

```ts
type CombatVitals = {
    barrier: number;          // current pool, integer-ish amount
    barrierTurns: number;     // 2 after a grant, decremented at owner action end
};

type DamageComponentInput = {
    amount: number;           // post-mitigation, post-affinity base damage
    kind: 'physical' | 'magical' | 'true';
    barrierMultiplier?: number; // e.g. 2 for +100% barrier damage
    onHit?: boolean;           // this component is on-hit damage
};

type DamageRecipe = {
    components: DamageComponentInput[];
    // No attacker for DoT/bleed/reflect/counter: no lifesteal.
    attacker?: Character;
};

type DamageRecord = {
    baseTotal: number;        // sum of component amounts
    effectiveTotal: number;   // sum of amount × barrierMultiplier where present
    barrierAbsorbed: number;
    hpDamage: number;         // rounded, actually written
    lethal: boolean;
    lifestealRequested: number;
    lifestealApplied: number;
    absorptionRequested: number;
    absorptionApplied: number;
    healingReduced: number;   // total healing removed by Herida grave
    barrierAfter: number;
};

type HealRecord = {
    requested: number;
    reduced: number;
    applied: number;
};
```

`DamageComponent` in `worldTest/core/damage/composer.ts` gains
`barrierMultiplier` and `onHit`. The existing fields stay: element, amount,
label, kind, crit. `mergeComponents` includes both new flags in its merge key so
a `+100% barrier` component does not disappear into a normal component of the
same kind and element. The resolver exposes the pre-merge components and the
post-mitigation amounts to the recipe builder.

### 3. Barrier lifecycle

- `grantBarrier(character, baseAmount)` reads
  `barrierGainReductionPercent` (default 0), computes
  `granted = baseAmount × (1 - reduction/100)`, rounds it, and only if the result
  is positive adds it to the pool and sets `barrierTurns = 2`.
- A grant never changes an existing pool except by adding its amount; the timer
  is the only shared part.
- Barrier absorbs physical, magical and true damage. True damage has no special
  bypass.
- At the end of the barrier owner's action, `tickBarrier(character)` decrements
  `barrierTurns`; when it reaches 0 the pool is cleared. A new grant during the
  turn resets the timer to 2.
- `resetVitals(character)` clears barrier and timer at battle start and engine
  dispose so state cannot leak between fights.

### 4. Damage transaction (order is fixed)

```text
recipe components (already mitigated/affinity-applied)
  ↓
if barrier pool > 0:
    effectiveTotal = Σ(amount × barrierMultiplier ?? 1)
    absorbed = min(barrier, effectiveTotal)
    hpRaw = baseTotal × (1 - absorbed / effectiveTotal)
    barrier -= absorbed
else:
    effectiveTotal = baseTotal
    hpRaw = baseTotal

hpDamage = round(hpRaw)
write hp, update isAlive
  ↓
if lethal: skip absorption, still run lifesteal
lifesteal:
    onHitPhysical = Σ(amount where onHit && kind === physical)
    lifestealRequested = onHitPhysical × lifestealPercent / 100
    lifestealApplied = applyHeal(attacker, lifestealRequested, 'lifesteal')
absorption:
    if target survived:
        absorptionRequested = baseTotal × absorptionPercent / 100
        absorptionApplied = applyHeal(target, absorptionRequested, 'absorption')
  ↓
return DamageRecord
```

Important consequences:

- Barrier-absorbed damage counts for lifesteal and absorption because both use
  the post-mitigation component totals, not HP lost.
- Overkill counts because the component amount is used, not the target's
  remaining HP.
- A hit that kills the target still heals the attacker through lifesteal.
- A lethal hit skips absorption entirely.
- Absorption uses `baseTotal` (the normal post-mitigation total that includes the
  barrier-absorbed share and the HP share), not the inflated barrier-facing
  total. In the 68-base/118-effective/50-barrier example, absorption is based on
  68.
- No barrier means barrier multipliers do nothing; `hpRaw` is `baseTotal`.

### 5. Healing transaction

`applyHeal(target, requested, source)`:

1. returns 0 if the target is already dead;
2. applies `healingReductionPercent` from Herida grave (clamped at 0);
3. caps the result at `totalHp - hp`;
4. rounds once and writes HP;
5. returns a `HealRecord` for the tracker and log.

Direct heals, regen, lifesteal and absorption all use this function. Barrier is
never touched by healing.

### 6. Turn-start and barrier-timer pipeline

Both engines add one new moment, `on_turn_start`:

```text
owner turn start
  → status cleanup / expiry
  → faint or stun gate
  → on_turn_start status triggers (future hooks)
  → regen: applyHeal(owner, maxHp × regenPercent / 100, 'regen')
  → normal action
  → end of owner action: tickBarrier(owner)
```

- Regen runs after cleanup, so an expired Herida grave does not reduce that
  turn's regen.
- Regen runs while stunned, but not while fainted.
- Barrier timer ticks at action end, not at turn start, so a fresh grant survives
  the turn it was created.
- The hybrid engine must stop double-firing `on_turn`; replacing the pre-faint
  call with the new pipeline is part of the slice.
- The legacy engine's current behaviour of skipping an action whenever any
  `on_turn` status exists must be isolated; `on_turn_start` must not inherit
  that freeze.

### 7. Damage provenance and on-hit classification

Lifesteal cannot use the merged total. Recipes must carry provenance:

- basic attack components: `onHit = true`;
- physical skills explicitly marked as on-hit: `onHit = true`;
- counter and reflect components: `onHit = false`;
- impact-bonus and Sheen-style components: `onHit = false`;
- item `onHit` status effects that deal damage: `onHit = false`;
- bleed/burn/poison and other status damage: `onHit = false`.

`SkillSpec` gains an `onHit?: boolean` flag (name to avoid confusion with the
existing `ItemDefinition.onHit` hook) and physical skill damage marks its
components from it. `resolveGeneralAttack`'s counter and cover paths mark their
components non-on-hit. A component that is not physical cannot contribute to
lifesteal even if flagged.

### 8. Engine integration

**Hybrid engine** (`worldTest/core/combat/hybridCombat.ts`):

- `performAttack` calls `applyDamage` for the main hit and for reflect damage;
  it no longer subtracts HP directly.
- `performSkill` / `resolveSkillEffect` return effect recipes; the engine applies
  them.
- Cover is returned as a secondary recipe for the coverer instead of mutating
  the coverer inside the resolver.
- Heal-self, regen, lifesteal and absorption all call `applyHeal`.
- `on_turn_start` is inserted after the faint/stun gate; action end calls
  `tickBarrier`.

**Legacy engine** (`src/classes/Combat/IntervalCombat.ts`):

- imports `applyDamage`, `applyHeal`, `tickBarrier` directly from the same
  library module;
- its `IntervalDamage` result gains a recipe/components field so the worldTest
  resolver can hand back provenance;
- `healSelf` calls `applyHeal`;
- turn start gains `on_turn_start` and action end gains `tickBarrier`.

**Status damage** (`worldTest/core/statuses.ts`):

- bleed/burn/poison stop mutating HP and build a `DamageRecipe` with
  `onHit = false` and no attacker;
- the status definitions still live in worldTest, so they can import Vitals.

### 9. UI and tracking

- `BattleUnit` gets `barrier: number`.
- `battleUnitOf` fills it from `character.vitals.barrier`.
- `StatBar` gets a `barrier` type with a grey gradient, or an adjacent overlay
  above the HP bar; the arena unit card and status rail render it when
  `barrier > 0`.
- `BattleTracker` records `barrierAbsorbed`, `healingReduced` and the applied
  lifesteal/absorption per actor so the battle report can show them.
- The battle log labels barrier absorption and reduced healing; it must not
  print the inflated barrier-facing total as damage dealt.

### 10. Stat additions

`Statistics` and `DEFAULT_STATS` gain:

| Stat | Default | Used by |
|---|---|---|
| `lifestealPercent` | 0 | damage transaction |
| `absorptionPercent` | 0 | damage transaction |
| `regenPercent` | 0 | turn start |
| `healingReductionPercent` | 0 | healing transaction |
| `barrierGainReductionPercent` | 0 | barrier grant |

The fields are optional in `Statistics` for save compatibility, seeded in
`DEFAULT_STATS`, and readable through `getStat`. `StatusInstance`'s
`statsAffected` guard changes from truthiness to an explicit undefined check so
a default-0 stat can be modified.

### 11. Staged rollout

1. **Barrier:** Vitals module, Character vitals, grant/tick/reset, applyDamage,
   recipe fields, hybrid and legacy application, grey bar, tracker.
2. **Healing:** applyHeal, regen stat and `on_turn_start`, Herida grave status,
   all direct-heal call sites converted.
3. **Lifesteal:** component provenance/on-hit flag, physical basic and skill
   marking, lifesteal in applyDamage.
4. **Absorption:** absorption in applyDamage and its healing/tracker path.

Each stage ends with the transaction tests for that stage; later stages do not
change the earlier ordering.

--------------------------------------------------------------------------------

## Alternatives Considered

### Alternative A: Keep the exact “X = bonus / total” detax formula

The owner’s first overflow model divided the damage left after the barrier by
`1 + X`, with `X` equal to the barrier bonus divided by the post-affinity total.

* **Pros**: It matched the owner’s worked example and kept the idea that the
  barrier absorbs damage at an inflated rate.
* **Cons**: The formula is wrong at zero barrier (it returned 82.9 instead of
  68), a 1-point barrier nearly halved a large hit, and `X` was global, so side
  damage diluted the multiplier. It was also hard to explain in a tooltip.
* **Reason for Rejection**: Replaced by the proportional rule
  `baseTotal × (1 - absorbed/effectiveTotal)`, which keeps the barrier absorbing
  inflated damage but removes the boundary error and the tiny-barrier exploit.

### Alternative B: Barrier as a normal status with per-instance timers

Represent every barrier grant as a status, each with its own amount and
duration.

* **Pros**: Reuses the existing status UI, dispel and expiry machinery; no new
  Character state.
* **Cons**: Statuses are removed on expiry and cannot leave a remaining pool
  cleanly; stacking means multiple statuses and multiple timers; status removal
  would need to zero the pool; statuses are also cleansable/dispellable, which
  is not the intended barrier behaviour.
* **Reason for Rejection**: A barrier is one pooled resource with one timer, not
  a list of independent statuses. `CombatVitals` holds the pool and timer.

### Alternative C: Per-grant timers instead of refresh-all

Each barrier grant expires after 2 turns independently; the pool is the sum of
the live grants.

* **Pros**: Removes the “1-point grant keeps a 500 barrier alive” exploit and
  makes the timer credible.
* **Cons**: The owner explicitly wants one pool and a refresh on any positive
  grant; per-grant timers add bookkeeping and make the grey bar misleading
  because parts of the pool expire separately.
* **Reason for Rejection**: Owner decision. The refresh-all exploit is recorded
  as an accepted risk and future balancing can add a threshold or cap.

### Alternative D: Separate damage/healing implementations per engine

Keep the hybrid and legacy engines independent and add barrier/heal logic to
each.

* **Pros**: Smaller immediate diff in each engine; no library changes; no shared
  type work.
* **Cons**: Guarantees drift between engines; the same hit would treat barrier,
  absorption and lifesteal differently; bug fixes would need to be applied
  twice; battle trackers would see two records.
* **Reason for Rejection**: The owner requires one shared transaction. A single
  rules module is the only way to keep the ordering identical.

### Alternative E: Inject a callback into the legacy engine

Keep `Vitals` in worldTest and pass `applyDamage` / `applyHeal` callbacks into
`IntervalCombat`.

* **Pros**: Keeps the library independent of worldTest; avoids a worldTest
  import cycle; the library remains usable without the game rules.
* **Cons**: Adds an options surface and a per-engine adapter; every legacy
  caller must remember to pass the callbacks; standalone library tests need a
  fallback that would duplicate the rules.
* **Reason for Rejection**: Placing the transaction in `src/classes/Combat`
  lets both engines import the same functions without adapters. The module has
  no worldTest dependency, so the layering stays clean.

### Alternative F: Absorption only from HP damage actually lost

Base absorption on the HP lost after the barrier, ignoring barrier-absorbed
damage.

* **Pros**: Prevents absorption from healing through a shield that never cost
  HP; less chance of an HP faucet.
* **Cons**: Contradicts the owner’s decision that absorption counts barrier
  damage and remaining damage; makes absorption weak or useless on barrier
  builds.
* **Reason for Rejection**: Owner decision. Accepted risk: absorption can be a
  heal source when a barrier absorbs the hit.

### Alternative G: Strongest Herida grave wins

Keep the strongest active healing-reduction application instead of the latest.

* **Pros**: A weak new application cannot erase a strong existing debuff.
* **Cons**: The owner chose last-wins; strongest-wins needs extra bookkeeping
  and a comparison rule across sources.
* **Reason for Rejection**: Owner decision. The weak-overwrite case is recorded
  as an accepted risk.

### Alternative H: Drop barrier-damage multipliers from the first release

Ship the pool without the `+X% on barriers` damage variation.

* **Pros**: Removes the hardest provenance and overflow problem from the first
  slice; the barrier still works.
* **Cons**: The owner wants the shield-damage augmentation/reduction now as part
  of the design; removing it makes the transaction’s component model simpler
  but delays a requested mechanic.
* **Reason for Rejection**: The staged plan still keeps barrier multipliers in
  stage A, but the component flags and effective-total math are the cost that
  makes later lifesteal provenance possible. If stage A slips, this is the first
  piece to defer.
