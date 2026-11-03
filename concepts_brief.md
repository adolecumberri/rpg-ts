# Skills With Levels: Instances, Sources and Ownership

* **Author:** Lead (EGM brainstorm, DSH)
* **Date:** 2026-11-03
* **Status:** concepts brief after six fresh-context Goldfish lenses

## Overview

Skills become `{ skill, level }`. A character's skill set is made of **skill
instances** from two sources:

- **Own skills** — generator kit (`character.skillIds`), `CHARACTER_SKILLS`,
  learned skill-tree nodes, item-granted and status-granted skills — **static at
  level 1, never levelled**.
- **Job skills** — the held job's ladder (2-4 skills, unlocked at job levels
  1/3/5); their levels are stored **per (character, job, skill)** in the job's
  progress bucket (today's `enhancements` array becomes `skillLevels`). Only
  that job's enhancement picks raise them; switching away and back keeps them.

The same skill id may appear twice (own + job) and the owner wants **two
separate entries in the skill set, each with its own level** — nothing merges
and nothing takes a max.

## Analysis

Six lenses ran (design, codebase details, zoom-out, comprehension,
implementation readiness, structural). Deduplicated:

**High — instance identity is lost everywhere at the combat boundary.** The
engine and UI key skills by id: `availableSkillIds` dedupes by id,
`battleSkillSpecs` drops repeated `spec.id`, `HybridManualEvent.skills` is
`string[]`, `resolveManualSkill` uses `find(entry.id === skillId)` (first match
wins), auto cooldowns/meters/shared cooldowns are id-keyed, `JrpgArena` keys
options by `spec.id`, `TeamPage` keys rows and selection by `baseId`. With two
same-id instances, one silently shadows the other and the higher level is never
castable. A stable **instance key** must be threaded through menu options,
manual prompts, events, cooldowns and UI keys; the level must NOT be part of
the cooldown key (enhancing a skill must not reset its cooldown).

**High — the jobs already list their kit twice.** `SoldierJob` (and Archer,
Healer) pass `skillIds: ['disarm', 'stand']` AND declare those same skills at
`atJobLevel: 1` in `progression`. Today's `availableSkillIds` dedupe hides it;
under "no merge" every job character would get an own + a job row for the same
skill. One side must own the level-1 kit. Suggestion: `job.skillIds` is the own
kit, the ladder starts at level 3 (or list own only when absent from the
ladder).

**High — a rank is structural, not a value.** `disarm_2` changes targeting
`ENEMY -> ANY`; `foot_shot_3`/`focus_the_eyes_3` gain a second target;
`shield_bash_3` adds a defence scaling term; `nature_salve_2` adds a heal;
`derribo` raises `hpCostPercent`; names change (`Disarm +`, `Disarm ++`).
`resolveSkill(def, level)` cannot be a numeric table: the definition needs
**per-level override patches** (`Partial<SkillSpec>` per level, including
targeting, target count, status factories, names/rules), with snapshot tests
asserting each resolved level equals today's `_n` entry before the old ids are
deleted. Catalog shrinks from ~40 specs to ~12 definitions.

**High — save migration has no gate.** `WorldSession.fromSave` throws for any
version != `SAVE_VERSION` (still 1), `saveSystem` spreads `[...enhancements]`
(throws on an object), and nothing migrates before the version check. Needs
`SAVE_VERSION = 2` with an explicit v1->2 step: `enhancements: string[]` ->
`skillLevels: { skillId: 1 + picks }`, clamped to the ladder length, strays
dropped/refunded, `pendingPicks` preserved; raw localStorage copied before the
overwrite; old builds reject v2 (no downgrade). Fixture test from a real v1
save.

**Medium — the own source is precedence, not a union.** `skillIdsOf` is
`character.skillIds ?? CHARACTER_SKILLS ?? job.skillIds` — the first wins, so
there is no union today. Missing sources: status-granted skills
(`grantsSkills`, Fire Breath via Open Gate) and item-granted reactions; tree
nodes reference ids absent from the catalog (`warcry`, `chain_bolt`,
`stone_skin`, `blade_dance`, `fireball`). Source type should be a tagged union
(`{kind:'own'} | {kind:'job', jobId} | {kind:'status'}`), plus catalog-integrity
checks that every referenced id exists.

**Medium — passives and reactions bypass the skill list.** `impactProcsOf`
reads `skillIdsOf` only (job/tree skills never proc), and reaction handlers are
attached once by id in a WeakMap. With instances, duplicates could double-fire;
level changes need re-attachment. Both must read the authoritative instance
enumerator and re-attach on level/equip/job changes.

**Medium — level cap and ladder semantics are implicit.** The cap is
`plan.ranks.length` in data, "rank 3" only lives in comments; skills outside a
ladder (rest, fire_breath, adventurer/enemy kits) have no cap; the ladder grants
4 enhancement picks (`2,4,6,7`) for 2-4 skills, so not every ladder maxes.
Decide cap source, behaviour for level > number of definitions, and missing-def
fallback.

**Medium — the UI cannot represent instances.** Keys, selection and enhancement
comparison all use `baseId`; two same-id rows collide, highlight together and
enhance the wrong entry. Rows need the instance key, a visible **source/level**
label, and `applyEnhancement` must receive the instance. `knownSkillIds`
(`Set<string>`) stays base-id keyed — it masks names, not levels.

**Medium — cross-job visibility and pending picks.** `progression` reads only
the held job, so unspent picks and preserved levels of other jobs are invisible;
`pendingJobPicks` and the badge disappear after switching. Decide where stored
per-job levels appear (job page per job?) and whether picks are global or
job-bound.

**Low — power fantasy / content reality.** No overlap exists in current content
(no skill id is granted by two sources), so duplicates are speculative until
content collides; when they do, a permanently Lv1 own twin of a growable skill
is a dead grey row. The zoom-out lens suggests merging at resolution (max
level) instead of two rows — the owner has chosen two rows; this is recorded as
the rejected alternative and should be revisited if it reads as a bug.

**Low — one authoritative enumerator.** `skillIdsOf`, `availableSkillIds`,
`battleSkillSpecs`, `grantedSkillIds` and `ownedJobSkills` already disagree;
the instance model must provide **one** enumerator in `session` (it owns the
skill trees), from which the battle kit, reactions, procs, UI and known-skill
memory derive.

## Goals vs. Non-Goals

- **In scope:** skill instances with `{skillId, source, level}`; job levels per
  (character, job, skill); static own skills at level 1; per-level definition
  patches replacing `_2`/`_3` entries; one authoritative enumerator; save
  migration v1->2; UI rows keyed by instance with source/level labels.
- **Out of scope:** levelling own/tree/status skills (they stay static), new
  content, enemy skill levels beyond the static default, redesigning the
  enhancement economy.

## Alternatives Weighed

1. **Character-global level per skill** (one level shared by all jobs) —
   rejected by the owner: Shield Bash Lv3 in one job must be Lv1 in another.
2. **Merge duplicates at resolution (max level, one row)** — rejected by the
   owner (two instances = two skills), but flagged by two lenses as the safer UI
   default if duplicates ever appear.
3. **Per-level numeric value tables only** — rejected: ranks change structure
   (targeting, target count, extra heal/defence terms, names), so per-level
   override patches are required.
4. **Keep `_2`/`_3` ids alongside the new model** — only as a temporary alias
   map (`ALIAS[legacyId] = {baseId, level}`) during migration; never derived by
   string stripping.
5. **Item-granted skills as instances** — rejected for now: items grant
   `impactProcs`/reactions, not skills; add a `granted` source only if content
   grows one.

## Key Decisions & Staging

1. **Data:** `SkillInstance = { skillId: SkillBaseId; source: {kind:'own'} | {kind:'job', jobId} | {kind:'status'}; level: number }`;
   job levels live in `character.jobProgress[jobId].skillLevels` (plain JSON
   record, never a Map).
2. **Definition:** one catalog entry per skill with per-level override patches
   and a `levels` count; `resolveSkill(def, level)` must equal today's `_n`
   spec (snapshot tests); legacy ids resolved through an explicit ALIAS map.
3. **Enumerator:** `session.availableSkills(character): SkillInstance[]` is the
   only source of truth; battle kit, procs, reactions, UI, known-skills derive
   from it.
4. **Identity:** `instanceKey = source + skillId` threaded through manual
   prompts, events, cooldown/meter keys and React keys; level excluded from
   cooldown keys.
5. **Save:** `SAVE_VERSION = 2`, v1->2 migration in `fromSave` (before the
   version throw), raw save copied, tests for pick round-trip and reload.
6. **UI:** skill rows show source and level (`Job Lv 3`, `Own Lv 1`), enhance
   targets an instance, job page shows each job's stored levels.

## Open decisions for the owner (blocking)

- Resolve the level-1 double listing: does `job.skillIds` remain the own kit
  (ladder starts at 3), or does the ladder own level 1 too?
- Instance identity at the battle boundary: are cooldowns per instance or per
  skill id (per instance costs memory/keys but matches two rows)?
- Where do unspent enhancement picks and other jobs' stored levels surface?
- Is `SAVE_VERSION = 2` acceptable (old builds refuse new saves)?

## Revision after the owner clarification (v2)

- A job's skill list **is its ladder** (4 skills for now: 2 unlocked at job level
  1; future jobs may include passives). The separate `job.skillIds` level-1 kit
  disappears, so nothing is listed twice at level 1.
- Skill titles gain a **level suffix** derived from the level: `Shield Bash`
  (Lv1), `Shield Bash +` (Lv2), `Shield Bash ++` (Lv3); the catalog no longer
  authors three names per skill.
- **Cooldowns are unique per skill id**, shared by every instance of that skill
  (the engine's id-keyed cooldowns already behave this way; the instance key is
  only for dispatch/display).
- The player tells two same-id instances apart by the **level suffix and the
  damage forecast** (the gauge arrow previews the damage of the skill being
  checked).
- Own skills (generator kit, `CHARACTER_SKILLS`, tree nodes, status grants)
  stay static at level 1 and carry no suffix.
- Level cap remains 3; the job ladder's enhancement picks (levels 2/4/6/7) are
  the only way job skills level up.

Open decisions still blocking:
1. **Passives** (future jobs): do they occupy one of the 4 job slots, can
   enhancement picks level them, and do they appear in the player's skill list?
2. **`SAVE_VERSION = 2`**: acceptable that older builds refuse new saves?
3. **Same-level duplicates** (own Lv1 + job Lv1 of the same skill): identical
   title and suffix — do they need a visible source tag, or is that case
   considered impossible by content rules?

## Revision after the owner clarification (v3): duplicates collapse

The instance model is dropped. The owner's final rules:

- **One entry per skill id.** If a character owns a skill (own skills are always
  Lv1) and the held job also teaches it, the skill list shows **one** entry at
  the **highest level** (the job's stored level). No duplicate rows, no
  instance keys: every consumer keeps keying by skill id, and cooldowns stay
  unique per skill id as already implemented.
- **A job's skill list is its ladder** (4 slots for now: 2 unlocked at job
  level 1; passives possible). `job.skillIds` disappears.
- **Passives occupy slots.** Each skill declares a **max level**: passives and
  some actives are not enhancable (`maxLevel = 1`), others go up to 3.
  Enhancement picks may only raise a job skill below its max level. Passive
  skills are always active during battle (they never appear as castable
  actions, but they do appear in the skill list).
- **Titles derive the suffix from the level** (`Name`, `Name +`, `Name ++`);
  the catalog authors one name per skill.
- **Own skills are static Lv1** and only surface when the held job does not
  teach the same skill (the highest level wins).
- **Save versioning:** `SAVE_VERSION = 2`; old saves are not migrated —
  the game deletes/rejects them (the owner accepts losing them).
- Rank differences are structural, so the collapsed catalog definition carries
  **per-level override patches** (`Partial<SkillSpec>` per level), not just
  numeric tables; `resolveSkill(def, level)` must equal today's `_n` spec.

Consequences resolved from the first review round: instance identity and
per-instance cooldowns are no longer needed; the save migration code is
replaced by a version check and a save reset; the level-1 kit duplication is
gone; the remaining work is the catalog collapse, the level-aware resolver,
the per-job `skillLevels` bucket, per-skill `maxLevel`, passive handling in
battle, and the UI reading levels/titles from the resolver.

## Implementation status (v3 shipped)

- **Every skill is a definition.** Ladder skills have three levels (`maxLevel` 3)
  and every other catalog skill is a single-level definition (`maxLevel` 1), so
  the resolver/UI never special-cases a skill.
- `specOf(id, level?)` / `resolveSkill(definition, level)` return the spec of
  that level with a level-derived title (`Name`, `Name +`, `Name ++`) and the
  level's own description.
- **Job kits removed**: the job ladder is the job's skill list (2 skills at job
  level 1, 4 total); job levels live per (character, job, skill) in
  `jobProgress[jobId].skillLevels`; enhancement picks raise a skill up to its
  `maxLevel`; save version 2 (old saves are discarded).
- **Passives**: `passive` on the spec/definition and `maxLevel 1` when not
  enhancable. `HybridCombat` applies a passive's `statusOnSelf` at battle start
  (Captain Rodrigo carries `captain_discipline`: +20% defence / +10% magic
  defence as a status), and `battleSkillSpecs` hides passives from the action
  menus while `skillSpecsOf` still supplies them to the engine.
- `impactProcsOf` now unions own skills and job skills, resolved at their
  current level, so job passives' procs fire.
