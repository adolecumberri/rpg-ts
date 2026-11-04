# Battlefield Layout — Concepts Brief

* **Author:** Lead (EGM brainstorm)
* **Date:** 2026-11-04
* **Status:** anchored hypothesis, ready for Goldfish review

## Overview

The JRPG arena currently places units by **job position** (`Job.position` →
front/center/back tier). A 3v3 first mission therefore renders one unit per
tier and all three end up in a single horizontal line across the middle of the
floor; most of the tilted ground plane is unused and the result reads as
clunky. The owner wants the arena to stop using job positions and place units
from explicit **formation arrays keyed by the number of fighters per side**,
mirrored between allies and enemies, using the whole ground. Position stays
purely visual: targeting, turn order and combat mechanics are unchanged. The
cap for the hand-designed arena is **12 vs 12 per side**; larger fights become
auto battles later.

## Current arena facts

- `.jrpg-ground` is a tilted plane (`rotateX(60deg)`), with a usable ground
  band of `y=174..364` (design px). The camera fits the whole formation.
- Each side currently has three depth tiers (front/center/back) taken from
  `character.position`; each tier is a vertical column at a fixed x, and a
  column holds up to 4 (tier × 4 = 12 per side today).
- Sprites are anchored at the feet, rendered at one uniform size (28 design px,
  drawn 2× by CSS); HP/mana bars and status chips stack above the sprite.
- `Job.position` was made visual-only in the previous change; nothing in
  combat depends on it.

## The hypothesis

1. **Delete job-based placement**: remove `Job.position`, `tierOf`, the tier
   tables and the column-chunking placement from `JrpgArena`.
2. **Data model: formation arrays.** A formation for `n` units (1..12) is an
   array of rows; each row has a number of units. The table below is the
   starting point (front row first = nearest the center line):

   | n | rows | n | rows |
   |---|---|---|---|
   | 1 | [1] | 7 | [4,3] |
   | 2 | [2] | 8 | [4,4] |
   | 3 | **[1,2]** | 9 | [3,3,3] |
   | 4 | [2,2] | 10 | [4,3,3] |
   | 5 | [3,2] | 11 | [4,4,3] |
   | 6 | [3,3] | 12 | [4,4,4] |

   The 3-unit case is deliberately **1 front + 2 back**: the lone front unit
   sits on the center line, the two back units sit bracketed behind it. Back
   rows are **not lane-aligned** with the front row (brick/stagger offset).
3. **Mirroring:** both sides use the same formation, mirrored across the
   centre line (allies on the left half, enemies on the right).
4. **Floor usage:** rows are distributed across the whole usable ground band,
   from the center line to the outer edge of each half. Horizontal slot spacing
   is derived from the widest row (4 units) so a full 12-unit side fills the
   half; low-count fights (1–3) use generous spacing so they still occupy the
   floor instead of clustering at the centre. No large empty band at any count.
5. **Sprite size** stays uniform; depth is expressed by row placement (further
   rows sit higher on the ground plane), not by scaling.
6. **Cap:** hand-designed arena up to 12 per side. Above 12, the fight resolves
   as an auto battle later; the arena does not attempt a 13+ layout.
7. **Keep** `.jrpg-ground`, the camera fit, the turn strip, targeting overlays
   and the current sprite/animation sizing. Remove only the tier/column logic.

## Goals vs non-goals

**In scope**
- Slot-array placement data for 1..12, mirrored, using the full ground.
- Delete `Job.position` and all job/tier placement code.
- Arena renders from the formation arrays; feet stay on the ground plane.
- HP/mana/status attachments stay usable with staggered rows.
- 12v12 cap; >12 documented as auto-battle-only.

**Out of scope**
- Auto-battle implementation for >12.
- Combat/targeting changes (position stays visual).
- Different formations per side (mirrored only for now).
- New art or effects.

## Key decisions and open risks to stress-test

- The 1+2 triangle for three units is a chosen shape, not derived from a rule.
- Stagger + full-depth rows can make HP bars/status chips collide; attachment
  layout must be decided.
- The formation table is hand-authored and may need balancing between "fill
  width" and "fill depth".
- Removing `Job.position` also removes the row grouping used by the battlefield
  cards (`Battlefield.tsx` / `battleUnits`); decide whether cards flatten too.
- 12v12 at this sprite size may crowd the ground even with the camera fit.

## Goldfish synthesis (six lenses)

The anchored hypothesis survived the direction but not the geometry. Four
blockers and one ownership decision must be corrected before implementation.

**Corrected facts**

- **The arena never sees 12v12.** `CombatScreen` mounts `JrpgArena` only when
  total combatants ≤ 10; bigger fights use the `Battlefield` cards. Real
  gameplay caps are 6 party and ≤4 enemies; 12 is a dev-screen clamp. The
  1–12 table is therefore dev-only for now; gameplay needs 1–6.
- **The current half-floor is ~92–120 design px wide** (ally tier x 40/88/132),
  not 160 per side. Sprites render at **56 px** (28 box × 2 CSS). A 4-unit row
  needs 224 px: it overlaps by ~100 px. The shrink path is inert: the depth CSS
  is `scale(max(2, unitScale * shrink))`, so `unitScale`/`shrink` never apply;
  only the camera (floored at 0.7) can fit, and the bottom vignette can cover
  the lowest feet.
- **Row axis must be named.** The centre line is vertical (x); lateral lanes
  are x, depth is y. "Front row" is the smallest x-gap to the centre; "further
  rows higher" is y. The old tiers are lateral lanes, not depth rows.
- **`character.position` is not just visual in the repo**: `saveData`/`saveSystem`
  persist it, `session` writers set it, `battleUnits`/`Battlefield` read it, and
  the library still ships `POSITION_TAUNT_MULTIPLIERS`. The arena can stop
  reading it without deleting it; deletion is a core + save-format + tests
  change and is deferred to its own cleanup.
- **Slot stability:** `n` changes when a unit dies. The formation must be frozen
  at battle start and slots assigned once (dead units keep their slot) or every
  survivor jumps when someone falls.

**Revised hypothesis**

1. Keep placement purely visual and **independent of job/position for the
   arena**. Do not delete `Job.position`/`Character.position` in this change;
   stop deriving arena spots from them, and leave the field for cards/saves
   until a dedicated cleanup. Battlefield cards keep their own row source.
2. Add a pure layout module (e.g. `web/src/game/formation.ts`):
   - `formationFor(n): Formation | undefined` for 1–12 (content table),
   - slot coordinates normalized per side: depth `0..1`, lateral lane `−1..1`,
   - explicit per-row lane offsets (not stagger derived from the widest row),
   - explicit pitch per row computed from sprite width, so rows do not overlap,
   - `formationFor(13)` → undefined (auto-battle handoff is combat, not layout).
3. The arena converts normalized slots to design px:
   - `x = sideSign * (CENTER_GAP + depth * HALF_DEPTH)`, `CENTER_GAP` keeps the
     two sides from overlapping on the centre line,
   - `y = groundY(depth) + lane * lanePitch`,
   - mirroring is one sign flip; no per-side x tables.
4. Keep `.jrpg-ground` and the camera fit, but make the camera bbox read the
   slot list instead of `positionOf(tier)`. Raise the vignette/overlay z-order
   so back-row feet and arrows are visible; move HP/mana/status chips above the
   head and give targeted/active entities a z bump.
5. Freeze formations at battle start: `n` = starting fighters per side; dead
   units keep their slot and render dead, so nobody reflows mid-fight.
6. 1–6 are authored now (gameplay); 7–12 reuse the same rule and are only
   exercised on the dev screen until the arena entry threshold is raised. The
   >12 auto-battle rule stays out of this feature.

**Owner decisions still open**

- Raise the arena threshold above 10 (and if so to what) or keep 12 as dev-only.
- 1+2 triangle for three units: authoritative shape; confirm.
- Accept a tighter sprite box for 12 (e.g. 24 design px instead of 28) or allow
  rows to overlap less densely (3 per row max at 12).
- Cards (`Battlefield`/`battleUnits`) layout in the same change or follow-up.
