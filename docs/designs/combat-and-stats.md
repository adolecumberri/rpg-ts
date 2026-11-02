# Design Draft: Combat Process & Character Stats Through Jobs, Levels and Items

**Status:** draft (needs `egm-review`) · **Date:** 2026-11-02
**Author:** Lead

## 1. The combat process today

- A battle is built by `buildHybridCombat(session, fight, options)`: the
  player's active party plus the fight's `allyIds`/`allies()` on the left,
  `enemyIds`/`enemies()` on the right. Every fighter carries
  `intervalFromSpeed(speed)` and its `SkillSpec[]`.
- `HybridCombat.next()` advances the tick to the next due fighter and returns
  one event: `auto` (actor id, target id, damage split by kind, heal, kills,
  skill id) or `manual` (the player picks a target/skill). The engine ends with
  `{ kind: 'end', winner, ticks }`.
- Mana starts at `MANA.startOfBattle`; skills pay mana/hp on cast; the UI hides
  unaffordable skills and the engine refuses them.
- `BattleTracker` observes the event stream; `session.finishCombat` settles
  xp, gold, items, mission beats, faints and deaths.

## 2. Where stats come from

`Character.getStat(key)` = the generated base + job bonuses + tree-node
`statBonuses` + equipment effects (loadout items). Two layers matter:

| Layer | Owns | Lifetime |
|---|---|---|
| Job (`statBonuses`, `growth`) | held-job bonuses, growth ratios | swaps on job change |
| Level (`growthProfile`) | per-level gains | permanent while the job is held |
| Items/loadout | flat/percent modifiers | while equipped |
| Skill-tree nodes | permanent `statBonuses` | forever once learned |

The Oficio comparison subtracts the held job's bonus and adds the target's:
`after = current − oldJobBonus + newJobBonus`. It does not re-run level growth:
job growth changes future gains, not the current totals — worth stating
explicitly in the UI, since players may expect a respec-like recalculation.

## 3. Skills model redesign (decided, not yet implemented)

Current state: one catalog entry per rank (`disarm`, `disarm_2`, `disarm_3`);
`JobSkillPlan.ranks: SkillId[]` lists them; enhancement picks raise the rank.

Target state:

- **One skill entity** with `levels: 1..3`; values are arrays of three:
  `numberOfTargets: [1, 1, 2]`, `manaCost: [4, 6, 8]`, `power: [100, 145, 190]`,
  status turns, heal, cover %, cast time…
- The level indexes the arrays; `JobSkillPlan` stores a single `skillId` and
  enhancement picks raise the level.
- **Descriptions are functions** `(skill) => string` that read the resolved
  values, so the text follows the level automatically.
- Categorical/structural fields stay scalar: `targeting`, `rangeOf`,
  `requiresShield`, `dispel`, `reaction`, `impactProcs`, status definitions.
  (Open question for review: whether status definitions may vary per level.)
- Migration: keep the existing catalog entries as generated aliases
  (`disarm_2` → level 2 of `disarm`) until every consumer reads levels; the
  job ladder and enhancement store base ids already, so saves stay compatible.
- Consumers to change: `specOf` becomes level-aware (`specOf(id, level)`),
  `ownedJobSkills`, battle `skillSpecsOf`, skill tree nodes, the job page
  (one row per skill with its three levels), skill info panels and tooltips.

## 4. Open questions for review

1. Do status definitions (duration, modifiers) stay shared or become arrays?
2. Does the enemy generator pick a random skill level, or always level 1/2?
3. Does a skill discovered through an enemy count for the player's known
   memory? (Current answer: no — only party learning writes it.)
4. Is job growth applied retroactively on job change? (Current answer: no.)

## 5. Dev roguelite flow (implemented this round)

`screens/dev/RogueliteScreen.tsx` — team creation (1–4 heroes, job per slot),
escalating waves (jobs cycle, level climbs, one extra enemy every other wave),
auto-resolved hybrid fights, weapon rewards from the new `rogue_*` item families
(swords, bows, staffs ×3 tiers) and a rest heal between waves, with a run log.
It exists to exercise fight → reward → fight loops before the systems above are
refactored.
