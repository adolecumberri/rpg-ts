# Pirate Job Skills — Concepts Brief

* **Author:** Lead (EGM brainstorm with Goldfish review)
* **Date:** 2026-11-03

## Overview

Eight candidate skills for the new jobs (the first being the Pirate). The
question for this pass is not "how do we balance them", but **which of them the
current engine and data model can carry**, which need new engine support, and
what the smallest additions are. The skills mix four kinds of effect: blocking
actions, repeating effects over time, passive modifications, multi-target
attacks, on-hit procs, status dispelling, equipment removal, and team-count
passives.

The engine today: `SkillSpec` catalog with per-skill levels, `SkillDefinition`
(maxLevel/passive), job ladders (`Job.progression.skills` with `atJobLevel`,
`maxLevel`, `passive`), job unlocks (`Job.unlock`), per-(character, job, skill)
levels, interval battle (`HybridCombat`) with turn-start mana regen, status
system (`StatusManager`) triggered on `after_attack` / `after_turn`, team auras
(`combat/aura.ts`), impact procs (`damage/impact.ts`), and side-aware dispel
(`skillEffects.ts`).

## Analysis

### 1. Silence — for X turns, the character cannot cast skills (passives still apply)

**Supported today?** No. No status blocks skill use; `SkillSpec` has no silence
flag and `HybridCombat` filters only affordability and cooldowns.

**What exists that helps:** statuses with `duration TEMPORAL` + `applyOn` and
`usageFrequency PER_ACTION` already expire by turns; passives are already
excluded from the castable list (`battleSkillSpecs` filters `spec.passive`).

**Smallest addition:** a status flag (`blocksSkills?: boolean` on
`StatusDefinition`) and a filter in the combat skill list (and manual prompt) so
a silenced character keeps only "attack" (and passives stay on). X scales with
the skill's level through `SkillDefinition.levels`.
**Effort:** small. **Risk:** low.

### 2. Eter Syphon — steals HP and mana from the enemy for X turns; the caster does not act during that time

**Supported today?** Partially. The status system can fire a hook every turn
(`applyOn: 'after_turn'`, `usageFrequency: PER_ACTION`, temporal duration) and
`onTrigger(character)` accepts a closure, so a status created at cast time can
carry the caster reference and drain the bearer. But there is no "caster is
locked for X turns" mechanic.

**What is missing:** (a) a channel/action-lock status on the caster, (b) a
battle-end/manual-ui indication, (c) the drain itself (hp + mana transfer) must
respect the target's death and the caster's death.

**Smallest addition:** the drain status on the target + a channel status on the
caster with `blocksActions` (or reuse `blocksSkills` plus a "no attack" flag)
that the engine consumes per turn. The drain transfer is content code in the
status factory (captured caster).
**Effort:** medium. **Risk:** medium: repeated status damage ignores the normal
damage pipeline (armour/crit); status refresh and dispel interactions need
explicit rules; target death must stop the drain early; the caster must not
"double dip" if the battle ends.

### 3. Mana Flow — passive, increases mana generation per turn

**Supported today?** No. Mana regen is a constant (`MANA.regenPerTurn = 4`)
applied at turn start in `HybridCombat`; passives can already apply a status at
battle start (`statusOnSelf`), but statuses have no mana-regen field.

**Smallest addition:** a `manaRegenBonus?: number` field on `StatusDefinition`
(summed by the engine at turn start) plus a passive skill definition with
`statusOnSelf` carrying it. Alternatively a small engine read of a dedicated
status name — the typed field is preferable.
**Effort:** small. **Risk:** low. Interaction with mana cap and "never above
total" is already handled by the existing clamp.

### 4. Lateral Swing — a multi-target auto attack, no repeated targets, never allies

**Supported today?** Partially. `SkillSpec.targeting: 'ENEMY'` with
`numberOfTargets` samples that many distinct enemies without replacement
(`pickWeightedTargets`), so "no repeats" and "no allies" are already guaranteed
by the type. But it is the skill damage pipeline, not the basic-attack pipeline
(crit, impact procs, weapon scaling).

**Options:** (a) content-only with `damageFor` computing attack-scaled physical
damage per target — acceptable for a "wide swing", but it will not crit or
carry impact procs; (b) add an `attackLike?: boolean` flag to `SkillSpec` so the
engine routes the hit through `generalAttackResolver` per target (crit + procs),
which is a small engine addition.
**Effort:** small (a) / medium (b). **Risk:** balance/consistency more than
engineering.

### 5. Blunt Edge — passive, on-hit damage has a % chance to stun

**Supported today?** Partially. Passives can contribute `impactProcs`, which
fire on hits/impacts and receive the full hit context (attacker, defender).
`ImpactProc` has `every` (every Nth) but no random chance.

**Smallest addition:** `chance?: number` on `ImpactProc`; the trigger rolls and
applies the existing stun status (`stunStatus`) to the defender. The passive's
proc is already collected from passive specs by `impactProcsOf`.
**Effort:** small. **Risk:** the roll needs a randomness source; tests need a
seeded random (the combat already accepts an injected random in places).

### 6. Dispel — remove bad statuses from allies and good statuses from enemies

**Supported today?** Yes, exactly. `SkillSpec.dispel` has
`{ onAlly: 'negative' | 'positive', onEnemy: 'negative' | 'positive' }` and
`skillEffects.ts` resolves it by the target's side
(`removeStatusesByPolarity`). A `dispel` skill already exists in the catalog.
**Work needed:** content wiring only (grant it to the job ladder as a leveled
skill if the existing entry is not where it should be).
**Effort:** none/small. **Risk:** low.

### 7. Disarm — unequip the target's weapon until the end of the fight (one of two)

**Supported today?** No. The existing `disarm` skill is a stat debuff
(`disarmStatus`), not an equipment change. Equipment lives on the character
(`loadout` holes + legacy manager) and its stat modifiers are applied/removed
through `equipOrReplace` / `unequip`. The battle has no battle-scoped item
stash and no restore-at-end step.

**Smallest addition:** a battle-scoped "remove one wielded weapon" effect in the
combat engine: detach the weapon from the loadout/legacy manager (removing its
stat modifiers), stash the item on the combatant, and restore it when the
battle ends (win or lose). Must not consume/return the item to the inventory
during the fight. Two-weapon characters: remove one (the primary/hand weapon).
**Effort:** medium to large. **Risk:** high: battle-end restoration must be
unconditional; HP/stat recomputation; inventory ownership counters must stay
unchanged; saves mid-battle do not exist yet, which helps.

### 8. Crew — passive: applies "Crew X" to every team member with Crew, where X is the number of Pirates in the team; Crew gives X × 3 attack

**Supported today?** Partially. Team auras (`combat/aura.ts`) can apply a status
to every living team member of the holder, but the bonuses are fixed numbers,
not computed from the team composition. There is no Pirate job yet and no
"Crew" status.

**Smallest addition:** (a) a new Pirate job (ladder, unlock flag/requirements);
(b) a battle-start passive hook that can inspect allies/enemies (the current
passive support only applies `statusOnSelf`), so the Crew passive can count
Pirates (team members whose held job is Pirate, or carrying the Crew marker) and
apply the "Crew X" status (attack +X×3) to each of them. X = the number of
living Pirates.
**Effort:** large. **Risk:** high: "who counts as Crew" must be defined (job
held, or a Crew status), the count must update if a Pirate dies, the value must
be recomputed (aura sync) rather than fixed at battle start, and the passive
belongs to a job that may not be held by the receiver (second skill slot /
passive slot rules).

## Goals vs. Non-Goals

**In-Scope Goals**
- Determine engine support and smallest additions for the eight skills.
- Define a data model for the new jobs' ladders (levels, passives, maxLevel,
  unlock requirements).
- Order the work by risk: content-only first, then small engine flags, then
  battle-scoped equipment removal and team-composition passives.

**Out-of-Scope Non-Goals**
- Balance numbers (X values, chances, costs) — content tuning later.
- New battle UI for channeled skills beyond the status showing.
- Save-format changes for mid-battle state (there are no mid-battle saves).
- Job discovery missions content (only the unlock mechanism).

## Alternatives Weighed

- **Implement everything as statuses** (silence, channel, disarm via "weapon
  disabled" debuff, crew via fixed aura): rejected because it diverges from the
  requested behavior (weapon actually unequipped, attack counted from team
  composition) and would need the same engine hooks anyway.
- **Add a generic script/hook system to `SkillSpec`** (one `script` callback for
  every unusual skill): rejected as too broad; use typed flags
  (`blocksSkills`, `manaRegenBonus`, `chance`, `attackLike`, battle-start hook)
  so each behavior stays testable and visible in the data.
- **Build the Pirate job + skills all at once**: rejected for planning; the
  brief separates content-only skills (Dispel), flag-sized engine additions
  (Silence, Mana Flow, Blunt Edge, Lateral Swing), and the two heavy ones
  (Eter Syphon channel, Disarm, Crew).

## Key Decisions & Staging for Next Steps

1. **Stage A — content only:** Dispel (roadmap), new skill definitions/levels
   for the eight skills in the catalog, job ladders and unlock metadata.
2. **Stage B — small engine flags:** `blocksSkills` status flag; mana-regen
   status bonus; `ImpactProc.chance`; optional `attackLike` for Lateral Swing.
3. **Stage C — battle-scoped mechanics:** Eter Syphon channel (action lock +
   repeating drain), Disarm (detach/restore weapon), Crew (battle-start team
   passive + Pirate job + live count/aura recompute).
4. **Open decisions:** does the channel lock block the caster's basic attack as
   well as skills; is Lateral Swing content-scaled or routed through the attack
   resolver; who counts as "Crew" (holding the Pirate job vs a Crew status);
   should Disarm be resistible/limited to weapon holders.

## Goldfish Review Synthesis (BRAINSTORM)

Six fresh-context reviewers (design, codebase, comprehension, implementation
readiness, structural, zoom-out) reviewed this brief against the code. The
consensus changes the plan in three ways.

**Terminology corrections (adopted)**
- A status lasts "N actions by its bearer", not N global rounds. In the hybrid
  engine `after_turn` fires on both attacker and defender of an action, so a
  status that must be turn-based needs an explicit owner in the turn loop.
- Skill level is 1..maxLevel (<=3), raised only by job enhancement picks;
  never the character level.
- Paths in this repository's design docs are relative to `worldTest/core/`
  unless they start with `src/`.

**Blocking gaps the brief understated**
1. **No battle-end cleanup exists.** `finishCombat` (session.ts:1518) never
   clears statuses and never restores equipment; `clearStatuses`
   (statuses.ts:454) has no production caller. Any skill that leaves a status
   on a persistent party character (silence, drain) or detaches a weapon
   outlives the battle. This must be fixed before any new control skill ships.
2. **Stun is already broken.** `stunStatus` is `applyOn: 'after_turn'`, ONCE,
   duration 1; the same trigger pass cleans it up before `consumeStunTurn`
   reads it. Shield Bash's stun is dead today. Blunt Edge cannot ship before
   stun is repaired and tested.
3. **Per-cast status factories do not exist.** `statusOnTargets` is a static
   `StatusDefinition`; a drain that captures the caster needs a
   `statusForTarget?(actor, target)` hook like `damageFor`.
4. **Auras cannot re-emit a changed value.** `syncAuras` only adds a missing
   effect and removes dead sources; a live Pirate count cannot update.
5. **Status flags live in the worldTest augmentation** (`config/damage.ts`),
   not in the library's status type; the state that blocks skills/mana regen
   belongs there.
6. **A job ladder holds four skills, not eight.** Levels 1..7 with picks at
   2/4/6/7; the existing three jobs each teach four skills. Eight skills need
   two jobs or a deferred batch. `enhanceableSkillsOf` also caps every
   skill absent from `RANK_FAMILIES` at maxLevel 1, so ladder skills need
   registered rank entries or they cannot be enhanced.

**Revised scope after review**
- **Ship first (after the two prerequisites):** Silence (flag + gating),
  Mana Flow (regen field + hybrid turn-start read), Lateral Swing
  (content-scale `damageFor`, engine-side target validation), Dispel (wire into
  a ladder; fix its auto-policy side restriction and add a mana cost).
- **Second wave:** Blunt Edge (after the stun repair), Eter Syphon (needs
  `statusForTarget` plus a turn-owner for the channel), Disarm (retheme as a
  weapon-disable status first; true unequip only after the battle teardown
  exists), Crew (needs Pirate job, dynamic aura value, team passive hook).
- **Cut/merge:** Crew's four-Pirate stacking conflicts with the mixing-job
  ladder; the kit was four denial effects with no pirate-specific payoff.
  The first Pirate ladder should be four skills: Lateral Swing, Blunt Edge,
  Silence, Eter Syphon (the last two only after their prerequisites).
