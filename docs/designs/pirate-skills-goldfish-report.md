# Goldfish Annotated Review Report

**Target:** `docs/designs/pirate-skills-design.md` (full file, draft v2)
**Findings sources:** six fresh-context brainstorm reviewers (design,
codebase, comprehension, implementation readiness, structural, zoom-out)
on `docs/designs/pirate-skills-brief.md`.
**Effect:** every PROPOSE FIX below is already applied to the draft v2.

## Prioritized Findings & AI Suggestions

### 1. No production battle teardown — Severity: High
* **Affected Scope:** §3 P0.1, §7
* **Discrepancy Description:** `HybridCombat` has no end hook; `finishCombat`
  (session.ts:1518) never clears statuses; `clearStatuses` (statuses.ts:454) is
  test-only. Silence/drain would outlive fights; a detached weapon would be lost
  on flee/defeat.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Confirmed by three reviewers against production callers.
  Without a teardown, no persistent control skill is safe.
* **Proposed Edit:** P0.1 added; teardown called from `finishCombat` for
  won/lost/fled and from every battle driver.

### 2. Stun status is already dead — Severity: High
* **Affected Scope:** §3 P0.2, §4 Blunt Edge, §5
* **Discrepancy Description:** `stunStatus` is `after_turn`/ONCE/duration 1 and
  is cleaned in the same trigger pass, so `consumeStunTurn` never sees it.
  Shield Bash's stun does nothing today; Blunt Edge would add another dead
  effect.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** The reviewers traced `StatusManager.trigger` cleanup and
  the hybrid `performSkill` ordering; the brief's Blunt Edge mechanism would be
  a no-op.
* **Proposed Edit:** P0.2 requires the stun repair plus a test before Blunt
  Edge; Blunt Edge staged after it.

### 3. "Dispel is content-only" overstated — Severity: High
* **Affected Scope:** §1, §4 Dispel
* **Discrepancy Description:** The spec exists but no ladder teaches it, it has
  no rank entries, its auto policy cannot target the enemy side for `ANY`
  (autoSkills.ts), it has no mana cost (free manual stripping), and positive
  aura effects are re-added by `syncAuras`, so stripping an aura looks like
  nothing happened.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** The original brief treated this as zero work; the code says
  wiring, ranks, cost and rule decisions are needed.
* **Proposed Edit:** Dispel moved to Healer ladder wiring with the auto-policy,
  cost and aura-rule fixes in §4.

### 4. Eter Syphon needs per-cast statuses and a turn owner — Severity: High
* **Affected Scope:** §3 P0.4/P0.5, §4, §5
* **Discrepancy Description:** `statusOnTargets` is static; no caster capture.
  `after_turn` fires on both attacker and defender of actions, so a drain ticks
  per hit, not per turn; no action lock exists (only hardcoded faint/stun).
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Three reviewers independently found the static spec path
  and the double-trigger cadence.
* **Proposed Edit:** Added `statusForTarget` (P0.4), action-owner decay (P0.5),
  and staged Eter Syphon after both.

### 5. Disarm: no teardown, no hand, dual risks — Severity: High
* **Affected Scope:** §1, §5
* **Discrepancy Description:** The loadout holds real items in unordered holes;
  no primary-weapon rule; restore paths do not exist; item loss on flee/defeat;
  `disarm`/`disarmStatus` (attack −40%) already exists and is taught by Soldier.
* **AI Suggestion:** PROPOSE FIX (retheme), ESCALATE (true unequip)
* **Justification:** A weapon-disable status that removes/restores the item's
  modifier source self-cleans with teardown and matches visible behaviour; true
  unequip needs P0.1 plus a deterministic weapon rule.
* **Proposed Edit:** Draft retheme to `weapon_bind`; true unequip deferred with
  the restore requirement listed.

### 6. Crew is not implementable now — Severity: High
* **Affected Scope:** §1, §5
* **Discrepancy Description:** Auras only add missing effects and skip existing
  names, so a live count cannot change; passives are applied in the constructor
  before sides exist; no Pirate job exists; four-Pirate stacking contradicts the
  mixing-job ladder; no passive-slot cap.
* **AI Suggestion:** PROPOSE FIX (defer)
* **Justification:** All six reviewers flagged Crew (or its class stacking) as
  the riskiest item; it is a new mechanic, not a skill definition.
* **Proposed Edit:** Crew deferred with its prerequisites recorded in §5.

### 7. Eight skills exceed the house ladder — Severity: High
* **Affected Scope:** §1, §10
* **Discrepancy Description:** Existing jobs teach four skills (1/1/3/5) against
  four enhancement picks; eight skills × three ranks cannot fit one ladder.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Structural pattern verified in all three job files.
* **Proposed Edit:** First Pirate ladder cut to four skills; remainder staged.

### 8. Status flags must live in the worldTest augmentation — Severity: Medium
* **Affected Scope:** §3 P0.3, §6
* **Discrepancy Description:** Brief proposed widening the library
  `StatusDefinition`; existing extensions (`polarity`, `aura`, `grantsSkills`)
  live in `config/damage.ts`.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Keeps the library generic and matches the project pattern.
* **Proposed Edit:** P0.3 and §6 updated to the augmentation location.

### 9. Silence gating point — Severity: Medium
* **Affected Scope:** §7
* **Discrepancy Description:** The manual prompt intentionally lists unaffordable
  skills; only `battleSkillSpecs` filters. A separate menu filter would diverge
  from the planner.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** One chokepoint keeps menu/prompt/auto consistent.
* **Proposed Edit:** `skillsOf`/`battleSkillSpecs` is named as the filter owner.

### 10. Duration unit is ambiguous — Severity: Medium
* **Affected Scope:** §3 P0.5, §9
* **Discrepancy Description:** "Turns" is read as global rounds; hybrid
  `after_turn` fires twice per action; status chips print raw duration, so a
  3-action status shows as 4.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Comprehension reviewer plus two code reviewers found the
  same mismatch.
* **Proposed Edit:** Action-owner decay (P0.5), tooltips/chips say "actions",
  tests assert the count.

### 11. Lateral Swing guarantees are auto-only — Severity: Medium
* **Affected Scope:** §3 P0.6, §4
* **Discrepancy Description:** `resolveManualSkill` accepts any living
  combatant, so allies/duplicates pass; `attackLike` would create a second
  damage pipeline and drop counters.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Engine validation is required regardless of UI; content
  damage via `damageFor` avoids the split pipeline.
* **Proposed Edit:** P0.6 target validation; `attackLike` rejected.

### 12. Blunt Edge mechanism corrections — Severity: Medium
* **Affected Scope:** §4
* **Discrepancy Description:** No new `chance` field needed (`ImpactProc.onTrigger`
  receives `ctx.random`); impacts only run through `resolveGeneralAttack`, so
  skills never proc it; stun must be repaired first.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Verified in impact.ts/general.ts.
* **Proposed Edit:** Blunt Edge described with the existing proc context and
  the stun prerequisite.

### 13. Mana Flow engine coverage — Severity: Medium
* **Affected Scope:** §4, §9
* **Discrepancy Description:** Mana regen exists only in `HybridCombat.actOnce`;
  `IntervalCombat` has no mana path, and passives are applied only by the hybrid
  constructor.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** The skill would silently do nothing in interval battles.
* **Proposed Edit:** Documented limit in §4 and the test list.

### 14. Rank registration and enhancement rot — Severity: Medium
* **Affected Scope:** §3 P0.7, §8
* **Discrepancy Description:** Skills absent from `RANK_FAMILIES` cap at
  maxLevel 1; new ladder entries retro-grant rank 1 to mastered jobs with no
  pending pick, so they can never be enhanced.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Progression logic is explicit in `enhanceableSkillsOf`.
* **Proposed Edit:** P0.7 requires rank entries; §8 documents the mastered-job
  rule.

### 15. Passive ownership and dispellability — Severity: Medium
* **Affected Scope:** §5, §6
* **Discrepancy Description:** Passivity has three owners (plan, definition,
  spec); `JobSkillPlan.passive` is never read. Passive statuses are positive and
  can be dispelled, while auras are re-added each action.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Structural reviewer named the conflict; design reviewer
  flagged dispellable passives.
* **Proposed Edit:** `SkillDefinition.passive` declared sole owner (wave-two
  cleanup); passives should be `persistent` so Dispel cannot strip them.

### 16. No Pirate job / no cutlass weapon — Severity: Medium
* **Affected Scope:** §6
* **Discrepancy Description:** `ALL_JOBS` has four jobs; `WEAPON_TYPES` has
  sword/bow/staff only.
* **AI Suggestion:** PROPOSE FIX
* **Justification:** Content must exist before the ladder references it.
* **Proposed Edit:** Pirate job file + `ALL_JOBS` entry; sword wielding until
  weapon families exist.

### 17. Design coherence: four denial effects, no pirate identity — Severity: Medium
* **Affected Scope:** §1, §11
* **Discrepancy Description:** Silence, Eter Syphon, Blunt Edge and Disarm all
  remove enemy uptime; none pays off kills or loot; the Pirate identity is not
  stated.
* **AI Suggestion:** ESCALATE
* **Justification:** Product/owner decision, not a code constraint. The review's
  proposed four-skill Pirate ladder is recorded, but the identity sentence and
  the final cut are the owner's call.
* **Proposed Edit:** Open question in §11; no silent scope change.

### 18. Unlock pacing mission unscoped — Severity: Medium
* **Affected Scope:** §6, §11
* **Discrepancy Description:** `knownBy`/`jobLevel`/`jobMastered` exist, but no
  mission sets the Pirate flag and no level gate is chosen; the job would
  otherwise be free at game start.
* **AI Suggestion:** ESCALATE
* **Justification:** Content/pacing decision with no code evidence to settle it.
* **Proposed Edit:** Owner question in §11; unlock contract in §6.

### 19. Smaller nits — Severity: Low
* **Affected Scope:** various
* **Discrepancy Description:** `SkillSpec.attackLike` naming (pipeline should be
  explicit), status chips show raw duration, `JobSkillPlan.passive` unread,
  `doubleWeapon` is character-level not job-level, interval engine disagreement.
* **AI Suggestion:** DECLINE (recorded; the material ones are folded into the
  items above, the rest are follow-up cleanup).
* **Justification:** No text change needed beyond what was applied.

## Resolution Gate

**ESCALATE (owner input needed):**
1. Pirate identity sentence and final first-ladder four skills.
2. Pirate unlock: which mission sets the flag, which base-job level gate.
3. Dispel home: Healer ladder vs shared.
4. Weapon disable vs true unequip final scope.

**Confirmed applied:** items 1–16 and 19's folded parts.
