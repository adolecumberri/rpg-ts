# Design: Job Change Page (Oficio)

**Status:** implemented (dev-verified) · **Date:** 2026-11-02
**Author:** Lead · **Brief:** `concepts_brief.md`

## Problem

The Oficio panel showed only the job list and one stat delta per stat. The
player could not evaluate a job change: the target job's skill ladder was
invisible, the currently held job was selectable until the confirm button,
and "known" skills had no memory — a name the party had already learned was
indistinguishable from one never seen.

## Data model

### The player's known-skill memory

- `WorldSession.knownSkillIds: Set<string>` — skill ids any **team or roster**
  member's held job has taught so far.
- Persisted in `SaveData.knownSkills?: string[]`; optional so old saves load.
- `syncKnownSkills()` unions `ownedJobSkills()` over `session.team.getAll()`
  and `session.roster.all()`. Idempotent.
- Written when:
  - a mission reward grants job xp (`syncKnownSkills` after the reward block),
  - a job change succeeds (`setJob`),
  - a save loads (restore then backfill),
  - the Oficio page opens (backfills already-trained recruits and old saves).
- Read only by the job pages, as requested; combat keeps using `availableSkillIds`.

### The page

- **Job list:** the held job is `disabled` with the sub-label `Current job`.
- **Skill ladder:** `job.progression.skills` (all four entries, `atJobLevel`
  1/1/3/5). A row shows the name when `session.knowsSkill(skillId)` is true,
  otherwise `????`; the level is always shown.
- **Stats table:** `Before` (live stat) → `Change` (`After − Before`, green/red)
  → `After` (live − held job bonus + target job bonus).
- Skill ranks stay grouped under one row; the catalog redesign (one skill,
  three levels) will make this exact rather than a grouping.

## Non-goals

- Rewriting the skill catalog (see `combat-and-stats.md`).
- Revealing unknown skill descriptions: only the name is gated.

## Verification

`tsc --noEmit`, `eslint src --ext .ts,.tsx`, `vite build`; headless Chrome run:
Team → Squad → Job Change → Archer shows
`Foot Shot Lv 1 | Concentration Lv 1 | ???? Lv 3 | ???? Lv 5`, the Soldier row
disabled as `Current job`, and matching Before/Change/After arithmetic
(e.g. HP 87 → −4 → 83).
