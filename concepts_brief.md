# Shields, Lifesteal, Absorption, Regen and Herida Grave

* **Author:** Lead
* **Date:** 2026-11-09
* **Status:** anchored hypothesis, ready for Goldfish review

## Overview

Add a shield resource and four related life-manipulation mechanics to the
combat system:

- **Shields** absorb damage before HP, stack into one pool and expire after
  2 turns.
- **Lifesteal** heals the attacker from on-hit physical damage.
- **Absorption** heals a percentage of damage received.
- **Regen** heals a percentage of max HP at turn start.
- **Herida grave** reduces all healing received and is a future status/stat.

The mechanics should share one damage/healing transaction used by both combat
engines, and shields need their own grey bar in the UI. This brief is the
brainstorm hypothesis; no implementation has started.

## Confirmed rules from the owner

### Shield model

- One shield pool per character. Amounts add into it.
- A new positive shield grant refreshes the whole pool's timer to 2 turns.
- The pool expires together; it does not have separate timers per grant.
- Shields cannot be healed or refilled by healing.
- True damage does not bypass a shield.
- A victim status such as **Broken Shield** reduces the amount of newly
  granted shields (example: a 100 shield becomes 40), never the existing pool.
- Shield damage multipliers ("+X% on shields") are a property of a damage
  component/skill/weapon and only apply to shield-facing damage. They do not
  apply when the target has no shield.

### Shield damage and overflow

Damage is computed normally first: mitigation, elemental affinities and
post-affinity totals. A shield-facing component can carry a shield-damage
multiplier.

Owner example: a 50 hit with +100% shield damage, plus 6 physical + 6 fire
+ 6 magic side damage, produces 118 post-affinity total; the shield-only
bonus is 50 (`+50` extra), and `X = 50 / 118`. With a 50 shield, 50 is absorbed
and the remaining 68 is treated as `100% + X%`; HP damage is
`68 / (1 + X) ≈ 47.76`.

Confirmed test cases:

| Shield | HP damage |
|---|---|
| 50 | `68 / (1 + 50/118) ≈ 47.76` |
| 100 | `18 / (1 + 50/118) ≈ 12.64` |
| 30 | `88 / (1 + 50/118) ≈ 61.8` |
| no shield | 68 (the base 50 + 18 side damage; never 118) |

- Only components that carry the shield multiplier get the shield-facing
  inflation. Side components pass through their own normal affinities.
- Overflow is detaxed proportionally so it returns to normal HP damage.
- The shield behaves like HP: the defender's affinities apply to it.

### Lifesteal

- Heals the attacker from **on-hit** physical damage: basic attacks and
  physical skills flagged as on-hit.
- Does **not** heal from counters (physical but not on-hit), item-triggered
  status damage, or impact-bonus components (e.g. Guinsoo's +6).
- Shield-absorbed damage counts as damage dealt.
- Overkill counts; damage after mitigation counts even if the target has less
  HP.
- The attacker heals even if the target dies.
- Magic and true damage will use a future omnivamp stat, not this lifesteal.
- Lifesteal heals through the normal healing pipeline, so Herida grave
  reduces it.

### Absorption

- Heals a percentage of **all post-mitigation damage received**.
- Counts physical, magical and true; counts damage eaten by a shield.
- Triggers on bleed/DoT/reflect/counter damage as well as direct hits.
- Never prevents death: if the hit is lethal, absorption does not heal.
- A fully absorbed shield hit still counts as damage received for absorption.
- Healing goes through the normal healing pipeline.

### Regen

- A percentage of max HP.
- Applied at turn start in the `on_turn_start` pipeline.
- Status cleanup/expiry happens first; an expired status does not apply.
- Works while stunned; does not tick while fainted.
- Healing goes through the normal healing pipeline.

### Herida grave

- A status-driven stat that reduces **all healing received** by a percentage.
- Latest application replaces the previous one; it can be cleansed.
- No cap or minimum healing.
- Does not affect shields.

### Other confirmed decisions

- Lifesteal, absorption, regen and Herida grave are Character stats that
  default to 0 for now and can later be moved by equipment/statuses.
- HP remains integer; fractional healing is calculated and then rounded or
  accumulated (open implementation detail).
- A separate grey shield bar is required in the UI.
- One shared damage/healing transaction is required for both the hybrid and
  legacy interval engines.

## Current code facts

- HP is `stats.hp / stats.totalHp`; healing currently mutates HP directly in
  `resolveSkillEffect` and in status hooks. No central `heal()` exists.
- Damage is resolved in `worldTest/core/damage/general.ts`, applied directly
  to HP in `HybridCombat` and in `resolveSkillEffect`. There is no damage
  event bus and no post-damage hook shared by both engines.
- "Shield" today means the offhand equipment item and skills requiring it
  (`skillGating.ts`), not a temporary HP pool.
- `regenStatus()` exists but fires on `turn_end`, while the hybrid engine fires
  `on_turn`, `after_attack` and `after_turn`; it may be dead as written.
- Status moment triggers are string-based (`StatusManager.trigger`).
- Damage components have kinds physical/magical/true and elemental affinities
  are multiplier layers in `damage/composer.ts` and `damage/affinities.ts`.
- The legacy `IntervalCombat` carries its own damage/healing flow.

## Goals

- One coherent ordering for shields, HP damage, lifesteal, absorption and
  healing reduction.
- Shared implementation for both engines.
- Clear separation between the physical shield item and the shield pool.
- A UI that shows the pooled shield separately from HP.
- Future-friendly stats for lifesteal/absorption/regen and Herida grave.

## Non-goals for this first step

- Implementing omnivamp for magic/true lifesteal.
- Balancing final percentages, durations or content values.
- Changing existing elemental affinity rules.
- Persisting shield state between battles.
- New status content beyond the hooks needed to test the mechanics.

## Open risks to stress-test

- The overflow detax formula (`(D - shield) / (1 + X)`) is unusual and may
  behave strangely at shield boundaries or when multiple components carry
  shield multipliers.
- "On-hit" is not a first-class concept in the current `SkillSpec`/damage
  component model; adding it may collide with the existing item `onHit`
  hook naming.
- Multiple HP mutation sites make a single shared transaction a refactor, not
  an additive feature.
- Integer HP plus fractional healing needs a precise rounding rule.
- Shield stat/pool naming collides with the equipped shield item.
- Status cleanup ordering at turn start is currently spread across faint,
  mana and status triggers.
- Absorption/lifesteal need to avoid double counting cover redirects,
  counters, reflect and multi-component attacks.

## Goldfish synthesis (six lenses)

**Verdict:** the direction survives, but the brief is **not implementation-ready**.
The feature is one damage/heal refactor plus four mechanics, and the review found
four structural blockers before the first line of code.

### Blockers

1. **The detax formula is wrong at the boundaries and not expressible today.**
   `(D − S) / (1 + X)` at `S = 0` returns `118 / 1.4237 ≈ 82.9`, not the confirmed
   68; a 1-point shield would nearly halve the hit. The formula must be
   piecewise (no shield → no multiplier; clamp at 0), and `X` is currently
   global, so side damage dilutes it. `DamageComponent` has no shield
   multiplier field, and `mergeComponents` merges by `kind:element`, destroying
   the distinction between a 50 shield-hit and a 6 side hit. The design needs a
   per-component `shieldMultiplier` and pre-merge subtotals.
2. **"On-hit" is not data.** The only existing `onHit` is `ItemDefinition.onHit`
   (a post-damage side-effect hook). `SkillSpec` has no on-hit flag and the
   merged damage total cannot tell basic attacks from counters, item status
   damage or Guinsoo components. Lifesteal needs a first-class damage
   provenance/on-hit classification, not a heuristic.
3. **The turn-start pipeline does not exist.** `regenStatus` fires on
   `turn_end`, which no engine fires. `on_turn` fires before the faint/stun gate
   in the hybrid engine (and double-fires in one path), while the legacy engine
   stalls any action that has an `on_turn` status. A new `on_turn_start` moment
   must be added after status cleanup and faint/stun handling, in both engines.
4. **A shared transaction is a refactor, not a feature.** HP is written in at
   least ten places: both engines, `resolveSkillEffect`, cover, burn/poison/
   bleed, and `healSelf`. The legacy engine lives in `src/` and cannot import
   the worldTest transaction. The realistic shape is one `applyDamage` /
   `applyHeal` in worldTest, with the legacy engine calling an injected apply
   callback, or the legacy engine moving into worldTest. Resolvers must return
   recipes and stop mutating HP.
5. **Zero-valued stats are inert.** `StatusInstance` skips `statsAffected` when
   the current value is falsy, so a new default-0 stat (lifesteal, absorption,
   regen, healingReceived, shield grant) cannot be modified by a status.
   The stats must be seeded in `DEFAULT_STATS` and the guard changed to
   `typeof value === 'undefined'`.
6. **Shield state has no home and a naming collision.** "Shield" already means
   the offhand item (`wearsShield`, `requiresShield`, item id `shield`). A
   refreshable pool is not a `Stats` modifier and not a normal status. The
   review recommends battle-scoped `CombatVitals` on `Character` (or stats
   fields) named `barrier` / `overshield`, timer tied to the owner's action
   count, reset at battle start and `dispose()`.

### Discovered contradictions and exploits

- The 1-point shield exploit: because the whole shield bonus is refunded
  through any shield, a tiny barrier can dramatically cut a large hit.
- Refresh-all is exploitable: one 1-point grant keeps a 500 pool alive.
- Absorption based on shield-absorbed and overkill damage is an HP faucet:
  it can heal from hits that never cost HP. Lifesteal's overkill rule can turn
  a 1 HP target into a heal battery.
- `Herida grave` last-wins lets a weak new application erase a strong one;
  review suggests strongest-wins.
- Counters, reflect, cover redirects and DoT damage bypass the current damage
  resolver, so absorption/lifesteal can double-count or miss them.
- HP is currently fractional in the engine (damage totals to 2dp; UI rounds),
  while the brief says integer HP. A single rounding/carry rule is required.
- UI: HP bars render in at least six places; the grey bar needs `StatBar`,
  `BattleUnit`, the arena rail and forecast snapshots updated, otherwise it
  will not repaint consistently.

### Recommended staged shape

1. **A — Barrier.** Pool + timer + grant path + one `applyDamage` in worldTest
   + grey bar. Smallest shippable slice.
2. **B — One `heal()` + regen + Herida grave.** Adds `on_turn_start`, healing
   reduction and the turn-start order.
3. **C — Lifesteal.** Requires the on-hit provenance flag and the
   transaction record.
4. **D — Absorption.** Last because it depends on the record and lethality
   ordering.

Do not ship all four in one PR.

### Owner decisions needed

1. **Detax:** keep the exact table (and accept the 1-point-shield distortion),
   or simplify to "shield absorbs `min(pool, damage × multiplier)` and the
   remainder passes untouched"? If kept, it must be per-component and piecewise.
2. **Refresh-all:** keep one timer refreshed by any positive grant, or limit
   refresh to grants above a threshold / use per-grant timers?
3. **Absorption base:** keep shield-absorbed and overkill damage (strong, can
   be an HP faucet), or switch to HP damage actually lost?
4. **Herida grave:** keep last-wins, or strongest-wins, and what is the
   reduction cap?
5. **HP rounding:** integer HP with a defined carry/rounding rule, or allow
   fractional HP internally and round only in the UI?
6. **Naming:** accept `barrier` / `overshield` for the HP pool while the
   physical shield item keeps "shield"?
7. **Scope:** confirm the four-step staging or name a different first slice.

## Final decisions (lead, after Goldfish review)

The owner confirmed the naming, absorption base, last-wins Herida grave,
integer HP rounding and the staged delivery. Where the overflow question was
unclear, I am making the simplifying call for the brief:

### Barrier overflow (simplified, final)

The earlier `X = 50/118` detax formula is replaced. It produced a 1-point
barrier that nearly halved a large hit, and it was hard to explain.

Final rule:

- Compute each damage component normally: mitigation and affinities first.
- Components that carry a barrier-damage multiplier use
  `effective = base × multiplier` for the barrier-facing total.
- `totalBase` = sum of normal post-mitigation component damage.
- `totalEffective` = sum of barrier-facing component damage (multiplier
  applied only to components that carry it; no barrier means the multiplier
  never applies).
- With a barrier pool `S`, absorb `min(S, totalEffective)`.
- HP damage = `totalBase × (1 - absorbed / totalEffective)`.

Example: base total 68, effective total 118, barrier 50. Absorbed 50 of 118;
HP damage = `68 × (68/118) ≈ 39.19`. A 1-point barrier leaves ≈ 67.4 HP
damage, not ≈ 47. This keeps the “barrier absorbs the multiplied damage”
idea without the global-X distortion.

### Other final decisions

- The mechanic is called **barrier** (`barrier` pool), never “shield”. The
  offhand item keeps the name shield.
- Barrier is battle-scoped runtime state, not a persisted stat or a normal
  status. Suggested shape: battle vitals `{ barrier, barrierExpiresAt }` reset
  at battle start and engine dispose.
- Any positive barrier grant adds to the pool and resets the pool timer.
  Existing pool amount is untouched. Broken-barrier status reduces only the
  newly granted amount.
- Absorption counts both barrier-absorbed damage and HP damage, and is skipped
  when the hit is lethal.
- Lifesteal is on-hit physical only; shield/overkill damage counts; it heals
  even when the target dies; counters, item status damage and impact-bonus
  damage do not qualify.
- Regen is `regenPercent` of max HP at turn start after status cleanup, works
  while stunned, not while fainted.
- Herida grave is a status that sets the healing-received reduction; the
  latest application wins; it is cleansable, has no cap and does not affect
  barrier.
- HP stays integer. Damage/heal fractions are summed within the transaction
  and rounded once at the final HP write; no fractional HP is stored.
- Stats: `lifestealPercent`, `absorptionPercent`, `regenPercent` (default 0),
  `healingReductionPercent` (default 0), `barrierGainReductionPercent`
  (default 0). Barrier amount/timer are runtime vitals, not stats.
- One shared `applyDamage` / `applyHeal` transaction is required. Resolvers
  must return damage/heal recipes with provenance (`onHitPhysical`,
  `barrierMultiplier`) instead of mutating HP. The hybrid engine uses the
  worldTest transaction directly; the legacy engine needs an injected apply
  callback or moves into worldTest.
- Turn-start order: status cleanup/expiry → faint/stun gate → regen → action.
  A real `on_turn_start` moment must be added to both engines.
- Delivery order: (A) barrier + applyDamage + grey bar; (B) heal() + regen +
  Herida grave; (C) lifesteal with on-hit provenance; (D) absorption.

### Known accepted risks

- Refresh-all can keep a large barrier alive with a 1-point grant. Accepted
  for now; a cap/threshold is future balancing.
- Absorption can be a heal source because it counts barrier-absorbed damage.
  Accepted by the owner.
- Last-wins can let a weaker Herida grave replace a stronger one. Accepted by
  the owner.
