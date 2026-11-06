# Battlefield Layout

*   **Author:** Lead
*   **Status:** Draft
*   **Date:** 2026-11-04

--------------------------------------------------------------------------------

## Overview

The JRPG battle arena currently places each fighter using the character's job
position (`Job.position` → front / center / back tier). That model is being
retired. A 3v3 opening fight shows the failure directly: the party holds one
Soldier, one Healer and one Archer, so each tier receives exactly one unit and
the three fighters land in a single lateral line across the middle of the
ground. The tilted floor above and below that line stays empty, and the
formation reads as an accidental row rather than a battle.

This design replaces job-based placement with a **formation array keyed by the
number of fighters per side**. Each count (1 through 12) selects a row layout
(front row first, for example three units = one front plus two behind), rows
are mirrored between allies and enemies, back rows are offset rather than
lane-aligned, and the rows are spread across the whole usable ground band. The
layout is purely visual: turn order, targeting and combat math do not change.
The hand-designed arena targets up to 12 fighters per side; larger fights are
left to a future auto-battle mode.

## The Problem

- Placement is derived from the held job, not from how many units actually
  fight. The first mission's 3v3 composition (one unit per job tier) collapses
  into one horizontal line at the arena's vertical center.
- The ground plane is the largest visual element in the arena, but the layout
  uses only a narrow band of it at 3v3. The empty floor makes the fight look
  sparse and the characters look clunky.
- The current three lateral tier columns were sized for a small demo, not for
  formations. They cap useful width, they repeat the same x positions at every
  unit count, and they cannot express shapes like "one in front, two behind".
- Job position was made visual-only in an earlier change, so nothing mechanical
  depends on it. Keeping it as the arena's layout source now only preserves an
  obsolete visual rule.

## Goals

- **Count-driven formations.** The arena places units from a formation array
  keyed by the number of units per side, covering 1–12. The 3-unit case is
  one front + two back.
- **Use the ground.** Formation rows spread from the center line toward the
  outer edge of each half and across the usable ground depth, so small fights
  do not cluster on one line and 12-unit sides fill the floor without a large
  empty band.
- **Mirrored sides.** Both sides use the same formation, mirrored across the
  center line; no per-side layout tables.
- **Stable placement.** A formation is fixed at battle start and every unit
  keeps its slot for the whole fight, including after it dies, so survivors do
  not jump when the count changes.
- **Readable overlay.** HP/mana bars, status chips, the active marker and the
  target arrow stay above the sprites and remain legible in staggered rows.
- **No mechanics change.** Targeting weights, turn order, damage and the
  combat engines are untouched. This is a presentation change.
- **Verifiable in the dev arena.** The dev battle screen can sweep 1–12 units
  per side and show that every count produces its intended shape on the floor.

## Non-Goals

- Deleting `Character.position`, `Job.position` or the save field. The arena
  stops reading them; their removal is a separate core/save cleanup.
- Auto battles for fights above 12 per side. The arena returns no formation for
  13+; how those fights resolve is decided later.
- Per-side or author-defined formations. Both sides mirror the same layout.
- Raising the arena entry threshold above the current combat-screen gate or
  changing the `Battlefield` card fallback view in this change.
- New character art, sprite sheets, effects or ground art.
- Any change to job identity, skill behavior or combat balance.

## Open Questions

- **Arena entry threshold:** the combat screen currently mounts the arena only
  when total combatants are ≤10, so 12v12 is a dev-screen shape. Keep 12 as a
  dev-only target for now, or raise the threshold and fit it in this change?
- **Density at 9–12:** resolved in implementation: lanes run along the
  vertical ground band, so 4-unit rows fit at the full 32px sprite box. Revisit
  only if real 12v12 readability (bars/status chips) needs spacing changes.
- **Battlefield cards:** `Battlefield`/`battleUnits` still group by
  `character.position`. Do the cards get re-sourced from formation slots in
  this change, or stay as they are until the position cleanup?

## Critical User Journeys (CUJs)

### CUJ 1: The opening 3v3 fight

*   **Given**: The player enters the first mission with a Soldier, a Healer and
    an Archer against three enemies.
*   **When**: The arena mounts.
*   **Then**: Each side shows one front unit and two units behind it, staggered
    across the floor; both sides mirror across the center line; the fight is
    readable without any unit being a one-unit "row".

### CUJ 2: A larger battle

*   **Given**: A fight (or the dev screen) fields six units per side.
*   **When**: The arena mounts.
*   **Then**: Each side shows two rows of three, using the full ground band; all
    sprites are whole, HP bars and status chips stay attached to their unit,
    and a back-row target or active arrow is visible.

### CUJ 3: A unit dies

*   **Given**: A battle with several units per side.
*   **When**: One unit's HP reaches 0.
*   **Then**: The dead unit keeps its slot and renders dead; no surviving unit
    moves or changes rows, and the camera does not jump.

### CUJ 4: Dev verification sweep

*   **Given**: The dev JRPG battle screen.
*   **When**: The author cycles ally/enemy counts through 1–12.
*   **Then**: Every count maps to its authored formation, the two sides mirror,
    no sprite is cropped, and 12 per side fits without overlapping outside the
    ground band.

--------------------------------------------------------------------------------

## Technical Plan (Architecture)

### Data flow

```text
fight (allies[], enemies[])                 battle start, once
        |
        v
formationSlotsFor(sideCount)                pure: count -> Formation (rows)
        |
        v
layoutFormation(slots, side, arenaMetrics)  pure: slots -> { x, y } design px
        |
        v
JrpgArena placements                         frozen for the whole fight
        |
        +--> entity sprites (feet-anchored)
        +--> active tile / target overlays
        +--> camera bbox
        +--> effect anchors
```

The arena keeps one placement per combatant for the whole battle. It is
computed from the **starting** number of fighters per side; a death does not
change the count, so no survivor moves.

### Formation content (new pure module)

Create `worldTest/web/src/game/formation.ts`:

*   `MAX_FORMATION_SIZE = 12`.
*   `type Formation = readonly number[]` — units per row, front row first.
*   `formationFor(n): Formation | undefined` — the authored table:

    | n | rows | n | rows |
    |---|---|---|---|
    | 1 | [1] | 7 | [4,3] |
    | 2 | [2] | 8 | [4,4] |
    | 3 | [1,2] | 9 | [3,3,3] |
    | 4 | [2,2] | 10 | [4,3,3] |
    | 5 | [3,2] | 11 | [4,4,3] |
    | 6 | [3,3] | 12 | [4,4,4] |

*   `formationSlotsFor(n): Slot[] | undefined`, where
    `Slot = { row: number; lane: number }` and `lane` is a centered offset in
    units of the row pitch (0 = middle). Three units therefore produce one
    `row 0 / lane 0` slot and two `row 1` slots at `lane -0.5` and `+0.5`.
*   Rows are centered. Rows with different unit counts are naturally offset;
    equal-count rows align into a grid. No half-lane brick shift is applied:
    a 4-lane row already uses the full ground band.
*   `formationFor(13)` and above return `undefined`. The arena does not attempt
    that layout; the caller treats it as "no hand-designed arena".

### Layout (same module, pure)

`layoutFormation(formation, side, metrics)` returns one `{ x, y }` per slot in
design px:

*   `CENTER_X = 160` (the vertical skirmish line; the ground is 380 px wide at
    left −30, so the center is 160).
*   `CENTER_GAP = 28`: the front row sits `CENTER_GAP` away from the center
    line on its own side. Allies are left, enemies right; mirroring is one sign
    flip: `x = CENTER_X - sideSign * (CENTER_GAP + row * ROW_GAP)`.
*   `ROW_GAP = 56` design px. Three rows fit the half comfortably; the table
    never exceeds three rows.
*   `LANE_PITCH = (GROUND_BOTTOM - GROUND_TOP - SPRITE_BOX) / (maxLanes - 1)`:
    the vertical spacing between units in the same row, computed so the widest
    row spreads across the whole ground band (floor: `SPRITE_BOX + 4`). Lanes
    are centered on `GROUND_CENTER`; rows with different unit counts are
    naturally offset, equal-count rows align into a grid. No half-lane brick
    shift: a 4-lane row needs the full band already.
*   `GROUND_TOP = 174`, `GROUND_BOTTOM = 364` (feet band) move into this module
    (or a shared CSS variable) so the layout is the single owner of floor
    geometry. Feet stay on the band: `y` is the feet anchor, the sprite rises
    above it.
*   `spriteBoxFor(count)`: 28 design px at every count. Lane spread uses the
    vertical band, so a 4-lane row fits without shrinking the sprites. The
    arena passes this box to the sprite style; the entity CSS draws it at 2×.

### Arena rendering changes

`worldTest/web/src/components/battle/JrpgArena.tsx`:

*   Delete `TIERS`, `tierOf`, `positionOf`, `columnFitOf`, `COLUMN_FOOTPRINT`,
    `COLUMN_MAX`, `OVERFLOW_OFFSET` and the tier section boxes. Placements come
    from `formationSlotsFor(count)` + `layoutFormation(...)`.
*   Compute placements once per fight from the starting roster order (party
    order for allies, fight order for enemies) and store them in a memo keyed
    on the combatant id list. Dead units keep their placement.
*   Build the camera bbox from placements plus the sprite and attachment
    margins; keep the zoom-out-only behavior. Because slots spread across the
    full ground band, the camera no longer fits only the middle row.
*   Active tile, target overlays and effect anchors read the same placement
    map instead of `positionOf(tier)`.
*   Pass the count-derived sprite box to `spriteBoxStyle` / `spriteScaleFor`.
*   Give `.jrpg-entity--targeted` and `.jrpg-entity--active` a z-index above
    the rows behind them; the current fixed depth z-order hides a back-row
    target arrow.

`worldTest/web/src/components/battle/JrpgArena.css`:

*   Move HP/mana bars and status chips above the head (or into a slim strip at
    the feet) so a staggered row behind does not collide with the row in front.
*   Lower the vignette's z-index below the entities (or raise the entities
    above it) so the front row's feet are not covered at the bottom of the
    ground.

`worldTest/web/src/screens/dev/JrpgBattleScreen.tsx`:

*   Replace the row/tier placement controls with a unit-count sweep (1–12 per
    side) and a reset. This is the manual verification surface for every
    formation.

### Unchanged on purpose

*   `Character.position`, `Job.position`, the save field and their writers stay.
    The arena stops reading them; removing them is a separate core/save
    cleanup.
*   `Battlefield.tsx` / `battleUnits.ts` cards keep their current row grouping
    until the position cleanup (tracked as an open question).
*   Combat, targeting weights, turn order, damage and the hybrid engine are
    untouched.

### Verification plan

*   `npx tsc --noEmit` in `worldTest/web`.
*   Pure-module checks (node or the repo's test runner): every
    `formationFor(n)` sums to `n`; slots are unique; ally and enemy layouts
    mirror around `CENTER_X`; every slot's feet `y` stays inside the ground
    band; no two slots in the same row are closer than the sprite box.
*   Manual dev sweep: the dev battle screen at 1, 2, 3, 4, 5, 6, 9 and 12 per
    side; confirm the 3v3 triangle, the full-floor spread, no clipped sprites,
    readable HP bars and a visible back-row target arrow. Capture screenshots
    for the PR.
*   Full test suite and build stay at PR time, per the project gate.

## Alternatives Considered

### Alternative A: Keep the job tiers and only redistribute depth inside each tier

*   **Pros**: Smallest possible change; the three tier x positions and their CSS
    depth classes stay, and a unit's y position inside its tier can be spread
    across the ground band instead of sitting at the center. No new module, no
    formation table.
*   **Cons**: Placement still comes from the job, so the shape of the formation
    is a side effect of party composition. A 3v3 with one unit per tier remains
    one unit per x lane; changing job composition changes the layout. The
    count of units is never an input, so there is no way to express "four
    units, two rows of two" or a deliberate 1+2 triangle.
*   **Reason for Rejection**: It fixes the symptom (the line at the vertical
    center) without fixing the cause (job-driven placement). The owner asked
    for count-driven formations and for job positions to stop deciding the
    battlefield.

### Alternative B: One rule instead of an authored table

*   **Pros**: A rule such as "fill rows of at most four, centered, front row
    first, depth by row index" generates every count including 13+, and is
    shorter than a 12-row table. Adding a unit count later needs no content
    edit.
*   **Cons**: The desired shapes are not uniform in kind. Three units is
    deliberately one front plus two back, while four is two and two and five
    is three and two; a fill rule produces a different shape for three and
    cannot encode the owner's 1+2 exception without special cases anyway. The
    rule also decides the 9–12 shapes mechanically instead of letting them be
    tuned for floor fit.
*   **Reason for Rejection**: The owner specified the shapes, especially the
    three-unit triangle. An explicit table keeps that decision visible and
    editable; the layout function is still shared, so the table is only
    content.

### Alternative C: Delete `Character.position` and `Job.position` in the same change

*   **Pros**: Removes the obsolete concept completely; no field that means
    nothing can drift back into the layout, and `Battlefield`/`battleUnits`
    would be forced onto the new slot source immediately.
*   **Cons**: Position is persisted in saves, assigned by several session
    paths, read by the battlefield cards and dev screens, and still has dead
    library helpers plus tests around it. Deleting it means a save-format
    migration and touching the core character API in a presentation change.
    The review found the arena can stop reading the field without deleting it.
*   **Reason for Rejection**: Scope. The position field is deferred to its own
    cleanup ticket; the arena simply stops using it. The card fallback view is
    left on the old row source until that cleanup.

### Alternative D: Per-side authored formations

*   **Pros**: Enemies could hold a shield wall while the party uses a loose
    spread; encounter authors could make formations part of the fight design.
*   **Cons**: Two tables per count, a data path through fight definitions, and
    a second mental model for the player. It also makes the mirrored read
    ("two armies facing off") harder to keep consistent.
*   **Reason for Rejection**: For now both sides mirror the same formation.
    The layout function already takes a side sign, so per-side content can be
    added later without rewriting the renderer.

### Alternative E: Keep every fight on the `Battlefield` cards and drop the arena

*   **Pros**: Cards scale trivially to any count, already support more than ten
    combatants, and avoid placement geometry entirely.
*   **Cons**: Throws away the arena's ground, sprites, camera and effects,
    which is the presentation the feature is trying to improve. It also
    contradicts the requirement that the battlefield be used, not abandoned.
*   **Reason for Rejection**: Replacing the arena is a larger product change
    and does not address the visual complaint.

### Alternative F: Resolve 13+ fights in the arena with generated slots

*   **Pros**: One rendering path for every fight size; no auto-battle mode
    needed for presentation.
*   **Cons**: 13+ per side needs more rows than the ground can hold at readable
    sprite sizes, and the owner explicitly deferred those fights to auto
    battles. A generated layout would be unverified density-wise.
*   **Reason for Rejection**: Out of scope; `formationFor(13+)` returns
    undefined and the auto-battle decision stays future work.

## Non-Functional Requirements

*   **Performance**: the arena keeps the same DOM entity count (one entity per
    combatant) and the same animation intervals. Formation layout is computed
    once per fight from a small numeric table; no per-frame layout work is
    added.
*   **Compatibility**: no save-format change. The save still carries the
    (now arena-unused) `position` field, so old saves load and new saves stay
    readable by the current code.
*   **Rollback**: the change is contained to the web arena and the new pure
    module. Reverting the file changes restores the old tier layout; combat and
    saves are unaffected.
*   **Determinism**: the same fighter count and side always produce the same
    shape; no randomness in placement.

--------------------------------------------------------------------------------

## Additional Resources

*   `docs/designs/battlefield-layout-brief.md` — concepts brief and six-lens
    review synthesis.
*   `docs/designs/combat-flow.md` — current combat/rows background.
*   `worldTest/web/src/components/battle/JrpgArena.tsx` and
    `JrpgArena.css` — current tier placement, camera and sprite rendering.
*   `worldTest/web/src/screens/dev/JrpgBattleScreen.tsx` — dev layout surface.

## Future Improvements

*   **Position cleanup**: remove `Character.position`, `Job.position`, the save
    field, `BattleUnit.row`, the library row helpers and the taunt row
    multiplier once the arena and cards no longer read them.
*   **Cards**: re-source `Battlefield`/`battleUnits` card grouping from
    formation slots instead of position.
*   **Arena threshold**: raise the combat-screen arena gate above 10 and
    validate 12v12 in a real fight.
*   **Auto battles**: define how fights above 12 per side resolve.
*   **Per-side formations**: allow encounter content to author a different
    formation for each side using the same layout function.

## Detailed Implementation Plan

The work is one presentation change with one new pure module. No combat,
targeting, save format, job model or `Character` API changes. The open
questions above are converted to explicit constants/assumptions here; the
owner can revise them at review.

### Decisions fixed by this plan

*   Arena entry threshold is **not** raised. Gameplay keeps its ≤10 total gate;
    7–12 formations are exercised only on the dev screen until a later change.
*   The sprite box stays at 32 design px for every count. The formation
    spreads lanes vertically, so 12 per side fits without shrinking sprites;
    the entity CSS stays at a uniform 2× scale.
*   `Battlefield.tsx` / `battleUnits.ts` keep their current row source; they
    are not re-sourced in this change.
*   `Character.position`, `Job.position`, `SavedCharacter.position` and their
    writers remain. The arena stops reading position; the dead library row
    helpers are left for the position cleanup.
*   Placements freeze at battle start. The arena is always given the full
    combatant list (dead units included), so the id set only changes when a new
    fight mounts.

### 1. `worldTest/web/src/game/formation.ts` (Create)

*   **Type / Scope**: new pure TypeScript module (browser layer, no React, no
    DOM, no `@core` imports).
*   **Proposed changes**:
    *   Export `MAX_FORMATION_SIZE = 12`,
        `type Formation = readonly number[]` and `type Slot = { row: number; lane: number }`.
    *   `formationFor(n: number): Formation | undefined` with the authored
        table: `1:[1] 2:[2] 3:[1,2] 4:[2,2] 5:[3,2] 6:[3,3] 7:[4,3] 8:[4,4]
        9:[3,3,3] 10:[4,3,3] 11:[4,4,3] 12:[4,4,4]`; `n < 1` or `n > 12`
        returns `undefined`.
    *   `formationSlotsFor(n)` returns the slots in party order: row 0 is the
        front row, slots in a row are ordered left-to-right for allies before
        mirroring. Lane is a centered multiple of the lane pitch (for a row of
        `c` units: `(k - (c - 1) / 2)`).
    *   `spriteBoxFor(n)`: `28` at every count (4-lane rows fit the band).
    *   `layoutFormation(n, side: 'ally' | 'enemy')` returns `{ x, y }` in
        arena design pixels for each slot: `CENTER_X = 160`, `CENTER_GAP = 28`,
        `ROW_GAP = 56`, feet band `174..364`, lane pitch
        `(bandHeight - SPRITE_BOX) / (maxLanes - 1)` (floor `SPRITE_BOX + 4`).
        `x` uses a single sign flip for the side:
        `x = 160 - sign * (CENTER_GAP + row * ROW_GAP)`; `y` is centered on the
        band center plus the lane offset.
    *   Export the ground-band constants and the `Side` type so the arena and
        the camera share one source of floor geometry.
    *   Return `undefined` for `n > 12`; the caller must not fabricate a
        layout.

### 2. `worldTest/web/src/components/battle/JrpgArena.tsx` (Modify)

*   **Type / Scope**: arena renderer, ~1200 lines, largest change.
*   **Proposed changes**:
    *   Remove `TIERS`, `tierOf`, `positionOf`, `columnFitOf`,
        `COLUMN_FOOTPRINT`, `COLUMN_MAX`, `OVERFLOW_OFFSET`, the `DepthTier`
        type and the section-debug boxes.
    *   Build a placement map keyed by character id: one `{ x, y, side }` per
        combatant from `layoutFormation(allies.length, 'ally')` and
        `layoutFormation(enemies.length, 'enemy')`, assigned in roster order.
        Store it in a `useRef` keyed by the joined id list so a re-render
        (damage, turn changes) does not recompute it; a new fight (different id
        set) recomputes. Dead units stay in the map.
    *   Pass the placement `x/y` to each entity instead of the tier/index/count
        props; remove the tier class and `--jrpg-shrink` style.
    *   Use `spriteBoxFor(sideCount)` for every sprite box on that side and pass
        the matching scale to `spriteFrameStyle`; the two sides may use different
        boxes when their counts differ.
    *   Camera: compute the bbox from the placement map plus half the sprite
        box horizontally and the sprite box plus attachment margin vertically;
        keep zoom-out-only and the current floor. Drop the `positionOf` calls.
    *   Actor tile, active marker, target overlays and effect anchors read the
        placement map. Remove the `showSections` prop and its overlay.
    *   Targeted and active entities get a `--jrpg-z` (or class) above the
        normal entity stack so a back-row arrow is not hidden.
    *   Keep the turn strip, banner, options/target bars, sprite animation and
        effect behavior unchanged.

### 3. `worldTest/web/src/components/battle/JrpgArena.css` (Modify)

*   **Type / Scope**: arena presentation.
*   **Proposed changes**:
    *   Move the uniform 2× scale to `.jrpg-entity`; delete the
        `.jrpg-depth-far/mid/front` transform/filter rules and the removed
        section classes. This keeps the z-order simple and removes the inert
        `--jrpg-shrink`/`unitScale` path.
    *   Give `.jrpg-entity` a base z-index and `.jrpg-entity--active` /
        `.jrpg-entity--targeted` a higher one.
    *   Reposition HP/mana bars and status chips above the sprite head (for
        example with `bottom: calc(100% + 4px)`) so a staggered rear row does
        not sit on top of the front row's bars.
    *   Lower the bottom vignette's z-index below the entities (or raise the
        entities above it) so the front row's feet are not clipped.
    *   Delete the empty `.jrpg-active-tile--actor` rule and any orphaned
        section/depth rules.

### 4. `worldTest/web/src/screens/dev/JrpgBattleScreen.tsx` (Modify)

*   **Type / Scope**: dev layout preview.
*   **Proposed changes**:
    *   Remove `Tier`, `TIER_CYCLE`, `Distribution`, `tierFor`,
        `cycleDistribution`, `tierCounts`, `alliesTiers`, `enemiesTiers`,
        `showSections` and the Random re-roll seed.
    *   Keep the ally/enemy count cyclers (1–12) as the only layout controls.
    *   Build the squads without writing `character.position`; the arena derives
        placement from the counts.
    *   Show the current formation shape in the option sub-line
        (`formationFor(n)?.join('+')`, e.g. `1+2`).
    *   Keep the Turn cycler and inspector behavior.

### 5. `worldTest/web/src/assets/animationTiming.ts` (Modify)

*   **Type / Scope**: timing/size config.
*   **Proposed changes**:
    *   Remove `arenaSpriteBox` (arena size is now count-derived in
        `formation.ts`). Keep `fichaSpriteBox`, `squadCardBox`, the frame
        timings and the action-wait bounds.
    *   Update the file comment so it no longer claims the arena uses a fixed
        box.

### 6. `test/battleLayout.test.ts` (Delete) and `worldTest/core/config/battleLayout.ts` (Delete)

*   **Type / Scope**: dead interval-battle grid config and its test.
*   **Proposed changes**: delete both. `columnsFor` has no callers outside its
    own test; the new formation module is the only count→layout source. (If the
    owner prefers to keep the interval battle grid config for the legacy
    engine, leave both and mark them as legacy instead.)

### 7. `worldTest/web/src/game/battleUnits.ts` (Leave, note)

*   **Type / Scope**: battlefield card snapshot.
*   **Proposed changes**: none in this change. `rowOfPosition` remains the card
    grouping source until the deferred position cleanup. Record this in Open
    Questions.

### 8. `docs/designs/SITEMAP.md` (Modify)

*   **Type / Scope**: design index.
*   **Proposed changes**: register the final design at
    `docs/designs/battlefield-layout.md` with date, author, components and a
    one-line description.

### 9. `docs/designs/battlefield-layout.md` (Create at finalization)

*   **Type / Scope**: final design document.
*   **Proposed changes**: copy the reconciled contents of `design_draft.md`
    into the target design directory once the sections are approved.

### 10. `test/formationLayout.test.ts` (Create at PR time)

*   **Type / Scope**: pure unit tests for the new module.
*   **Proposed changes**: assert that every `formationFor(n)` sums to `n`,
    `formationFor(0/13)` is `undefined`, slots are unique, ally/enemy layouts
    mirror around `CENTER_X`, every feet `y` stays in the ground band, and no
    two same-row slots are closer than the sprite box. The project runs tests
    at PR time, not after every commit.

### Verification Plan

*   **Compilation**: `$env:NODE_OPTIONS=''; npx tsc --noEmit` in
    `worldTest/web`.
*   **Lint**: the project's Google-style eslint run at PR time.
*   **Unit tests**: `npm test` at PR time (includes the new formation test).
*   **Manual dev sweep**: `npm run dev:web`, open Dev Tools → JRPG Battle, step
    ally and enemy counts through 1, 2, 3, 4, 5, 6, 9 and 12. Confirm:
    *   3v3 is one front + two back, not a line;
    *   the ground band above and below the center is used;
    *   the two sides mirror and never overlap on the center line;
    *   12 per side fits without clipped sprites or unreadable bars;
    *   a back-row target/active arrow is visible;
    *   no sprite is cropped (element size matches the scaled frame).
*   **Regression**: run one story battle through CombatScreen to confirm the
    arena still mounts at ≤10 combatants and the turn strip/targeting work.
*   **PR gate**: full `npm test` and `npm run build` before merge, per the
    project's existing rule.
