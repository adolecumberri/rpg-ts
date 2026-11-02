# Web app polish review — CSS/HTML reuse + type consolidation

> Scope: `worldTest/web` (screens, components, styles).
> Goal: one visual system (same component → same look everywhere) and one type
> per concept. This doc is the tracking checklist: tick a box when a task is
> done, keep notes under it.

---

## 0. The trigger: "The General's Orders" vs "Go"

Both are **OptionsBar options rendered by the same `ActionButton`**, yet they
measure differently:

| Button | Screen | Bar layout | Size |
|---|---|---|---|
| The General's Orders | Order Camp (3 options, no banner) | rows + fixed-rows | 154 × **48** |
| Go | Map (text banner + pinned + back) | grid, no fixed-rows | 154 × **39.4** |

### Root cause (verified against the live DOM)

Two independent branches drift apart:

1. **A text banner switches the layout.** In `components/chrome/ActionBar.tsx`:
   `layout = banner ? 'grid' : layoutFor(...)` (line 149). Camp (3 options) →
   `layoutFor(3)` = **rows**; map (text banner) → forced **grid**.
2. **`bannerIsNode` is computed wrong for "no banner".** Line 170:
   `const bannerIsNode = typeof banner !== 'string'` — when there is **no**
   banner, `typeof undefined !== 'string'` is **true**, so
   `action-bar-grid--fixed-rows` is added (line 295). The live DOM of the camp
   reads: `class="action-bar-grid action-bar-grid--rows
   action-bar-grid--fixed-rows"`. The map, with a *string* banner, gets
   `bannerIsNode = false` and **no** fixed-rows class.
3. **Only "fixed rows" sizes the row.** `.action-bar-grid--rows` sets
   `grid-auto-rows: var(--bar-row)` (line 733) and `.action-bar-grid--fixed-rows`
   re-sets it (line 750); `.action-bar-grid--grid` (line 736) has its
   `grid-auto-rows` **commented out** (line 738). `.action-btn--lg` has no height
   by design ("the grid rows size the buttons", line 810).

Net effect: `no banner` → fixed rows → 48px. `text banner` → grid without fixed
rows → content-sized ≈ 39.4px. The same component, two heights, one bug.

- [x] **T1** Fix the guard: `const bannerIsNode = banner !== undefined && typeof banner !== 'string'`.
- [x] **T2** Restore a single row height for both layouts: `.action-bar-grid--grid { grid-auto-rows: var(--bar-row) }` — then `fixedRows` can go.
- [x] **T3** Remove the `fixedRows` prop from `ActionBar`/`OptionsBar` and its 3
      call sites (`JrpgArena`, `MessageBox` ×2, `MissionsPage`): fixed rows are
      the design, not an opt-in.
- [x] **T4** Delete the "no fixed height" note in `.action-btn--lg` once rows own
      the height everywhere.
- [ ] **T5** Add a visual regression check (see §5) so a layout branch can never
      again produce a 39.4px button.

---

## 1. HTML/CSS audit — reusable bits that should be unified

### 1.1 Bar + button system (highest value)

- [x] **C1** Collapse the three-layer bar: `OptionsBar` → `ActionBarCell` →
      `ActionButton` props. Today the same 12 fields (`label`, `icon`, `tone`,
      `accent`, `disabled`, `disabledReason`, `sub`, `tip`, `badge`, `slot`,
      `wide`, `onClick`) are declared/forwarded three times
      (`OptionsBar.tsx:10-30`, `ActionBar.tsx:11-37`, `ActionButton.tsx:31-71`).
      Target: **two** layers (`Bar` + `Button`), `OptionsBar` removed and its 26
      call sites switch to `ActionBar` directly.
- [ ] **C2** One bevel recipe: `.pixel-btn` (pixelUI.css:213) and `.action-btn`
      (line 791) are two unrelated skins; `.pixel-btn--primary` / `--danger` /
      `:active` (lines 250-289) hardcode ~20 hex values of a bevel the
      `.action-btn` family does not share. Introduce a shared `.pixel-bevel`
      base + `--btn-face/--btn-edge/--btn-line` vars, use it in both.
- [ ] **C3** Kill the second primary/danger palette: `.pixel-btn--primary` is
      green (`#2a3a1f`) while the bar's primaries are gold-accents; the team page
      uses `.pixel-btn--primary` for confirmation and `.inv-tab.pixel-btn--primary`
      for tabs (pixelUI.css:2141-2145, 2359). Define one `tone` scale
      (`default/primary/danger`) in the button component only.
- [x] **C4** `MessageBox` already renders its choices through `OptionsBar`
      (`size="lg"`), so the `.messagebox-choices .pixel-btn` block
      (pixelUI.css:3518) is **dead** — part of the dead-CSS sweep in C20. The
      same call sites will lose anything the old block styled.
- [x] **C20** Dead CSS sweep (verified orphans, 0 tsx references):
      `.actions-panel`, `.actions-row`, `.army-line*` (3 classes),
      `.fight-arena`, `.fight-arena--actions`, `.inv-head-action`,
      `.messagebox-choice-*` (6 classes), `.status-desc`, `.status-name`,
      `.status-row`, `.team-data-bars`, `.jrpg-active-tile--target`.
      377 classes are declared; ~30 are unreferenced in tsx (some are
      template-composed names like `.action-bar-grid--grid`, keep those). Delete
      the real orphans before the stylesheet split, so the split inherits less.
- [ ] **C5** 48 raw `<button>` elements in `*.tsx` — inventory them and move
      the interactive ones onto the shared button/row primitives.

### 1.2 Rows and lists

- [~] **C6** One list row: `.inv-item-row` (pixelUI.css, inventory/skills),
      mission rows, place options, `.team-card` (character cards),
      `.position-unit`, `.jrpg-order-chip` all re-implement "icon + label +
      value + selected state". Extract a `PixelRow` (props: icon, label,
      caption, value, selected, disabled, onClick, badge) and restyle all six
      from it.
- [ ] **C7** The skills list rows in `TeamPage` are `<div onClick>` (not
      buttons) while inventory rows are the same visual: unify on the `PixelRow`
      button element (also fixes keyboard access).
- [x] **C8** `.inv-item-row--preview` / `.pixel-cell--selected` /
      `.action-btn--selected` are three names for "this row is selected". One
      modifier: `.is-selected`.

### 1.3 Panels, modals, overlays

- [~] **C9** There are four panel/modal systems:
      `.pixel-panel` + `.pixel-title`, `.pixel-modal` + `.pixel-modal-overlay`
      (+ stacked `--modal-layer`), `.fight-end-modal`, `.report-modal-overlay`
      and `.fight-overlay`. Unify on `.pixel-frame` (panel chrome) +
      `.pixel-modal` (overlay + anchor), keep `--modal-layer` for stacks, make
      the fight-end and report modals use them.
- [ ] **C10** The end-of-fight modal (`CombatScreen`) and the stress-fight
      report modal (`StressFightScreen`) should be the same component family
      (`FightOverlay` with rows): their row layout is already duplicated.

### 1.4 Tokens: the palette and the spacing scale exist but are bypassed

- [~] **C11** 367 raw hex colors in `pixelUI.css`, **165 distinct**, against a
      `:root` with ~30 tokens. `--accent` (`#f2ca50`) is hardcoded 13 more
      times; `#99907c` 14×, `#403229` 11×, `#eedbcc` 9×. Extend the token set
      with the missing browns/warms and sweep the file (do it per section, not
      in one blind pass).
- [ ] **C12** 95 `style={{ }}` inline blocks across screens (top offenders:
      DamagesScreen 11, TeamData 9, ActionBarTestScreen 9, JrpgArena 9,
      StressFightScreen 9, CombatScreen 7, PlacePage 6). Each one is a CSS class
      waiting to exist; sweep with the same rules as C11.
- [ ] **C13** Spacing uses px literals (`8px`, `10px`, `154px`, `48px`) even
      though `--u: 4px` and `--s1…--s16` exist. Add a lint rule
      (`stylelint` `unit-disallowed-list` or a review checklist) and convert the
      layout-critical ones.
- [ ] **C14** Font family/size are re-declared per class (`'VT323', var(--font-pixel)`,
      `font-size-adjust`, 40+ occurrences). Define `--text-xs/sm/md/lg` tokens and
      a `.pixel-text` base; keep only overrides.

### 1.5 The stylesheet itself

- [~] **C15** `pixelUI.css` is **4199 lines**; only 6 small files are
      component-scoped (CombatForecast 412, WorldMap 217, SkillInfo 70,
      StatusChips 69, StatBar 15, JrpgBattleScreen 11). Decide a rule: *every
      component owns its css file; pixelUI keeps only tokens/reset/primitives*,
      then split by section (base / chrome / battle / screens).
- [~] **C16** `pixelUI.css` holds entire screen styles (team page 33 selectors,
      mission 27, equip 20, report 34, messagebox 18, tactical 18…) — move each
      block next to its screen.
- [x] **C17** 450 selector lines, dominated by `jrpg-` (74), `action-` (41),
      `report-` (34). The `jrpg-` block is the arena's private design system:
      extract it into `components/battle/JrpgArena.css` so the arena can be
      restyled without touching the global file.

### 1.6 Structure repeated in every screen

- [ ] **C18** Every screen repeats the page shell:
      `<div className="pixel-font" style={{ height: '100%', display: 'flex',
      flexDirection: 'column' }}>`. Extract `<PageShell>` (title/back/slot) so
      padding and bar anchoring are defined once.
- [ ] **C19** The bar is always the last child of a flex column, sometimes
      inside `.newui-page`, sometimes inside a raw div with inline flex. Give
      the shell one bar slot and stop positioning bars ad hoc.

---

## 2. Types audit — one type per concept

- [x] **Y1** `OptionSpec` (`OptionsBar.tsx:10`) vs `ActionBarCell`
      (`ActionBar.tsx:11`): 12 of 14 fields identical, and `OptionsBar` maps
      1:1. **Delete `OptionSpec`**, let `ActionBar` take `ActionBarCell[]`, and
      give the 26 call sites the extra `selected/mark/custom` fields for free.
- [x] **Y2** `ActionButton` props (`ActionButton.tsx:31`) are an inline literal
      that duplicates `ActionBarCell` again. Export
      `ActionButtonProps extends Omit<ActionBarCell, 'id' | 'onClick'>` or
      reuse the cell type.
- [x] **Y3** `TargetSpec` (`TargetBar.tsx:5`) is a 4-field subset of the cell
      (`id/label/icon` + `reachable`). Make it `Omit<ActionBarCell, …>` or fold
      `reachable` into the cell as `disabled + disabledReason`.
- [x] **Y4** `BattleUnit` (`Battlefield.tsx`) is mapped by two duplicated
      `unitOf()` functions (`CombatScreen.tsx:391`, `StressFightScreen.tsx:91`).
      Move one `battleUnitOf(character)` into `assets/sprites.ts`/shared game
      module and delete the copies.
- [x] **Y5** Two damage-kind unions: `DamageKind = ElementId | 'heal'`
      (`FloatingDamage.tsx`) and `ForecastDamageKind = 'physical' | 'magical' |
      'true'` (`CombatForecast.tsx`). Define one `DamageKind` in a shared module
      (core already knows the kinds) and import it in both.
- [x] **Y6** The battle-effect shape `{ id, targetId, animation }` is declared
      inline twice (`JrpgArena` props, `CombatScreen` state). Export
      `BattleEffect` from `assets/effects.ts`.
- [ ] **Y7** Two icon systems: `IconId` + `Icon` component (`assets/icons.ts`,
      chrome/Icon) and `ActionSvgIcon` (`assets/actionIcons.ts`) plus raw
      Material Symbols strings inside `ActionIcon`. Decide one icon pipeline
      (`ActionIcon` is the union — make the dictionary and the SVG set variants
      of the same registry).
- [ ] **Y8** `StatKey`/`STAT_CATALOG` (`game/statCatalog.ts`) duplicates the
      core stat names. Check whether core can export the canonical stat id union
      and web just decorates it with labels/icons.
- [ ] **Y9** `PendingBattle` (`MessageBox.tsx`) vs the engine's
      `HybridManualEvent`: check if the dialogue pending battle can simply be
      the engine event (they already carry actor/targets/kills). Fewer
      conversion points.
- [x] **Y10** `MissionTableRow` (`MissionTable.tsx`) vs core `Mission` — verify
      it is a real view-model (it may be fine) and not a copy of fields; if it's
      a passthrough, drop it.
- [x] **Y11** `Route` (`GameContext.tsx`) — check the navigate payloads are one
      discriminated union (place/team/mission/board/combat…); a stray string
      route would silently typecheck today.
- [x] **Y12** `SpriteRole` is `keyof typeof SPRITES` (good), but
      `JOB_SPRITE_ROLES` and `spriteRoleOf`'s override allow-list
      (`'archer' | 'mage' | 'warrior'`) repeat role names by hand — derive the
      allow-list from `SpriteRole` so a new role can't be forgotten.

---

## 3. Proposed updates (phased, so each phase ships)

### Phase 1 — "same button, same size" (small, fixes the reported bug)
- T1–T4 (bar rows + banner guard), C1 (collapse the bar types), Y1–Y3.
- Acceptance: every bar button on every screen measures 48px tall (lg), and
  OptionsBar → ActionBar → Button is two files instead of three.

### Phase 2 — primitives
- C2, C3, C4 (button skins + tones), C6–C8 (rows + one selected modifier),
  C9–C10 (panel/modal frames).
- Acceptance: a UI-kit dev page shows every primitive once; no screen needs a
  raw `<button>` or a bespoke row.

### Phase 3 — tokens + cleanup
- C20 (dead CSS orphans), C11–C14 (palette/spacing/typography sweep), C18–C19 (PageShell).
- C15–C17 (stylesheet split).
- Acceptance: zero hex literals outside `:root`, zero `style={{}}` in screen
  files that only set layout (except dynamic values like positions/sizes).

### Phase 4 — types
- Y4–Y12.
- Acceptance: `tsc --noEmit` with no duplicated shapes; one `DamageKind`, one
  `BattleUnit` mapper, one icon registry, one cell type.

### Phase 5 — guardrails
- A `UI kit` dev screen (extend `ActionBarTestScreen`) rendering every
  primitive + every bar layout (rows/grid/banner/pinned/paginated).
- Optional: a tiny dev-only console helper that logs the computed size of every
  `.action-btn` on a page, to catch layout-branch drift (the exact class of bug
  from §0).

---

## 4. Measured facts (for reference)

| Metric | Value |
|---|---|
| `pixelUI.css` | 4199 lines, 101 KB, 450 selector lines, single `:root` |
| Other CSS files | CombatForecast 412, WorldMap 217, SkillInfo 70, StatusChips 69, StatBar 15, JrpgBattleScreen 11 |
| Top selector prefixes | jrpg 74, action 41, report 34, team 33, pixel 31, mission 27, equip 20, newui 20, messagebox 18, tactical 18, inv 18 |
| Raw hex in CSS | 367 occurrences / 165 distinct (`#000` 35×, `#99907c` 14×, `#f2ca50` 13×) |
| CSS classes | 377 declared, ~13 orphaned blocks (0 tsx refs), ~17 template-composed |
| Inline `style={{}}` | 95 occurrences across 16 screens/components |
| Raw `<button>` in tsx | 48 |
| `.pixel-btn` usages | 35 (10 files) |
| `OptionsBar` call sites | 26 (all `size="lg"` or default) |
| `fixedRows` call sites | 3 (`JrpgArena`, `MessageBox` ×2, `MissionsPage`) |
| `pinLast` call sites | 2 (map, team) |
| `banner` call sites | 1 (map) |

---

## 5. Notes while reviewing

- **Verification used for §0:** headless Chrome (`--dump-dom`) against the dev
  server — the camp bar renders `action-bar-grid action-bar-grid--rows
  action-bar-grid--fixed-rows`; the code path for the map (string banner) yields
  `action-bar-grid--grid` without the fixed-rows class. The rest of the doc is a
  static read of the CSS/TS (counts from PowerShell scans on this tree).
- The arena already got its own sprite/animation system (`SpriteSet`,
  `BattleEffect`); its CSS is the biggest standalone block — splitting it is a
  low-risk win (C17).
- The dev screens (`screens/dev/*`) hold 11 inline styles and 7 `.pixel-btn`
  usages; they are the best place to prototype the primitives before the real
  screens migrate.
- Do not touch the game logic (`worldTest/core`) in this review: this work is
  presentation + type shapes only, except where a web type mirrors a core type
  (Y5, Y8–Y9).

---

## 6. Progress log

### Done — Phase 1 (the reported bug), verified in a live browser

- `ActionBar.tsx`: `bannerIsNode` guarded (`banner !== undefined && …`) — the
  undefined banner no longer silently forces fixed rows on every bar.
- `pixelUI.css`: `grid-auto-rows: var(--bar-row)` moved to `.action-bar-grid`
  (base) — rows/grid/banner/pinned all use the SAME row height; the
  `--fixed-rows` variant block and its class are gone.
- `fixedRows` prop removed from `ActionBar` / `OptionsBar` and its call sites
  (`JrpgArena`, `MessageBox`, `MissionsPage`).
- Measured over CDP (headless Chrome against the dev server):
  Order Camp bar → 320×**48** buttons; synthetic text-banner bar (the map case)
  → **48** (was **40** with `grid-auto-rows: auto`). Screenshot checked: styles
  intact.
- Note: the dev server had to be restarted with `--force` — its HMR cache was
  serving an empty module (`does not provide an export named 'JrpgArena'`).

### Done — Phase 3a (dead CSS) — by css-sweep teammate, verified by Lead

- 18 rule blocks deleted (142 lines): `.army-line*`, `.fight-arena*`,
  `.actions-panel`, `.actions-row`, `.inv-head-action`, `.messagebox-choice*`
  (incl. `.messagebox-choices`), `.status-*`, `.team-data-bars`,
  `.jrpg-active-tile--target`.
- `pixelUI.css`: 4193 → **4051 lines**; braces balanced (474/474); postcss parse
  OK. All deleted names: 0 refs in `.ts/.tsx`.
- `#f2ca50`: 13 → 3 (the 3 remaining are `:root` token definitions); the 10
  markup uses now read `var(--accent)`.

### Done — Phase 4 (types)

- `Y1`: `OptionSpec` is now `ActionBarCell` (alias) — one cell shape; `OptionsBar`
  is a thin pass-through, no field copy.
- `Y2`: `ActionButtonProps = Omit<ActionBarCell, 'id' | 'custom' | 'onClick'> &
  { size?; onClick? }` — exported.
- `Y3`: `TargetSpec = Pick<ActionBarCell, 'id' | 'label' | 'icon'> &
  { reachable? }`.
- `Y4`: new `game/battleUnits.ts` (`BattleUnit` + `battleUnitOf` +
  `rowOfPosition`); `Battlefield` re-exports the type; `CombatScreen` and
  `StressFightScreen` use the shared mapper (two copies deleted).
- `Y5`: `ForecastDamageKind = keyof DamageKindTotals` (derived from core). Note:
  `FloatingDamage.DamageKind` (`ElementId | 'heal'`) is a different concept
  (element glyphs, not buckets) and stays as is.
- `Y6`: `BattleEffect` exported from `assets/effects.ts`; used by `JrpgArena`
  props and `CombatScreen` state (inline shape removed twice).
- `Y10`: `MissionTableRow` reviewed — it IS a view-model (formatted days,
  commission, repeat), no change needed.
- `Y11`: `Route` reviewed — already one discriminated union, no change needed.
- `Y12`: `isSpriteRole()` guard added in `assets/sprites.ts`; override list
  derives from `SpriteRole` instead of hand-copied names.

### Done — Phase 5 (guardrail, first piece)

- `screens/dev/buttonAudit.ts`: `auditActionButtons()` measures every rendered
  `.action-btn` and reports distinct heights + per-button sizes.
- `ActionBarTestScreen`: new **Measure buttons** toolbar action renders the
  report panel (`Button sizes OK` / `MISMATCH`) — the next layout drift shows up
  on this page immediately.

### Done — Phase 2 (partial: rows + selection + overlay)

- **C8**: one selected modifier. `.inv-item-row--preview`, `.pixel-cell--selected`
  renamed to `.is-selected` (CSS qualifies them per base class:
  `.inv-item-row.is-selected`, `.pixel-cell.is-selected`, `.team-card.is-selected`;
  the dev item rows keep the look via `.item-page-row.is-selected` grouped with
  the inventory row rule). 6 call sites updated.
- **C6 (partial)**: the warm section-row recipe is now shared — `.mission-row`
  and `.item-page-row` carry the same well (`--well-alt`), double inset hairlines
  and row padding, with only the layout differing. A full `PixelRow` component
  is still pending.
- **C9 (partial)**: new `--overlay` token; `.pixel-modal-overlay` and
  `.fight-overlay` both use it (the fight overlay was 0.45 → now the one shade).
  Full panel/modal atom unification still pending.
- Heads-up: a scripted `Replace` mangled the quotes of 4 components
  (TeamCard/BattleCard/InventoryPage/FlagsScreen) and they were restored from
  HEAD and re-edited with the edit tool — lesson: never script text replacement
  on source files, use the edit tool.

### Done — Phase 3b (partial: palette + arena split)

- New warm palette tokens in `:root` (`--well`, `--well-alt`, `--modal-bg`,
  `--inset-warm`, `--line-warm`, `--hairline`, `--text-warm`, `--text-dim`,
  `--text-muted-warm`, `--text-cream`, `--paper`, `--gold-strong`,
  `--gold-bright`, `--overlay`) — exact values, zero visual change.
- Sweep: **92 lines** of hex literals replaced with those tokens.
  `pixelUI.css` hex literals: **367 → 224** (139 distinct left, mostly one-offs).
- **C17**: the whole JRPG arena block (87 rules) moved out of `pixelUI.css` into
  `components/battle/JrpgArena.css`, imported by `JrpgArena.tsx`.
  `pixelUI.css`: **4199 → 3412 lines** (+ 664 in the arena file).
- Verified by headless browser: the Order Camp screenshot is **byte-identical**
  before/after the token sweep; the dev JRPG Battle arena renders correctly
  (tiers, turn chips, 48px tray) with the CSS served from the new file.

### Pending (next sessions), in order

1. **Phase 2 — rest of the primitives (visual):** a `PixelRow` component for
   skills/inventory/mission rows (`<div onClick>` skills rows become buttons,
   C7); panel/modal unification (`.fight-end-modal` and `.report-modal-overlay`
   on `.pixel-modal` atoms, C9/C10); tone scale audit (C3).
2. **Phase 3b — rest:** the remaining 224 hex literals / 139 distinct (design
   pass to name the rest of the palette), the 95 inline `style={{}}` blocks
   (C12), the per-screen CSS blocks next to their screens (C16), and `PageShell`
   (C18/C19).
3. `Y7`/`Y8`/`Y9` remain design questions: one icon registry (dictionary vs SVG
   vs Material Symbols), a core-exported stat-key union, and whether
   `PendingBattle` can be the engine's `HybridManualEvent`.

---

## 7. Typography system (audit + unification plan)

### 7.0 Fixed before the typography work: sprite geometry was hardcoded in CSS

The squad/battle sprite animation assumed a **4-frame 16×16 sheet** in six
CSS rules (`background-size: calc(var(--s8) * 4)`, `@keyframes sprite-idle` to
`-128px`, `steps(4)`; plus `64px 16px` in the arena, `88px 22px` for the arena
banner avatar, `96px 24px` for the position view). The archer/soldier idle
sheets became 2-frame 128×64 files, so the CSS stepped 4 positions across a
2-frame sheet → the sprite blinked.

Fixed by making the sprite data the single source of truth:
`assets/spriteFrames.ts` exposes `spriteFrameStyle(animation, frame, scale)` and
`useSpriteFrames()` (looped, pausable, one-shot). Used by the squad cards
(3× → 48px), the battle fichas (`BattleUnit` now carries `SpriteAnimation` +
`attackSprite`), the arena entities (CSS scale floor 2 → 32px), the turn-order
chips and the 24px position view sprites; the six CSS rules lost their sheet
math and the `@keyframes sprite-idle` block is gone. **The render size of a
sprite is now one number** — `SPRITE_BOX` (`ficha: 40`, `squadCard: 48`) plus
the arena's CSS scale floor — so making them bigger is a single-line change.
The attack pose is **optional** in the sprite data: the new archer/warrior art
has only a 2-frame idle, so those roles hold their idle sprite during an action
(the old `archer_attack`/`warrior_attack` sheets are no longer referenced); add
an `attack` entry per role when the new attack art exists.

Measured on `worldTest/web/src/**/*.css` today.

### 7.1 What exists

Fonts referenced (93 `font-family` declarations):

| Font | Uses | Bundled? |
|---|---|---|
| `'VT323', var(--font-pixel, monospace)` | 53 | ✅ VT323.woff2 |
| `'Press Start 2P', var(--font-pixel, monospace)` | 15 | ✅ PressStart2P.woff2 |
| `'Space Mono', monospace` | 9 | ❌ not bundled → silent fallback |
| `inherit` | 8 | — |
| `'Material Symbols Outlined'` | 2 | ✅ icon font |
| `'FFTA'` / `'FFTA2'` | 3 | ✅ ffta.ttf / ffta2.otf |
| `--font-pixel` (`FFTA2, FFTA, ui-monospace…`) | 1 | ✅ |

Untracked font assets: `Zilvertype.ttf` is bundled but never used; `@font-face`
declares `FFTA` twice.

Sizes — **157 declarations, 27 distinct values**:

| Size | Uses | | Size | Uses |
|---|---|---|---|---|
| `var(--s3)` (=12px) | 30 | | `8px` | 8 |
| `11px` | 17 | | `10px` | 8 |
| `14px` | 13 | | `calc(var(--u) * 2.25)` =9px | 5 |
| `9px` | 10 | | `calc(var(--u) * 2.75)` =11px | 4 |
| `12px` | 10 | | `var(--s2)` (=8px) | 3 |
| `13px` | 9 | | `var(--s5)` (=20px) | 3 |
| `var(--s4)` (=16px) | 9 | | `calc(var(--u) * 2.5)` =10px | 3 |
| `15px` | 9 | | `calc(var(--u) * 2…)` etc. | 12 |

Other repeated declarations: `font-size-adjust: none` **58×**, `text-shadow: none`
**40×**, `text-transform: uppercase` **19×**, `letter-spacing` **15 distinct
values** (0.05em 14×, 0.025em 8×, 1px 3×, 0.6px 3×, 0.4px, 0.08em, 0.5px,
−0.5px…), `font-weight` **5 forms** (700 14×, normal 7×, bold 5×, 400, 900).
Inline typography in screens: **21** `fontSize`/`fontFamily` style props.

Text colours — mostly tokens now, but the raw ones still in use:
`#4ade80` 6×, `#f87171` 4×, `#60a5fa` 3×, `#f7e6d4` 3× (≈ `--text-cream`
`#f6ded1`), `#b7c6ee` 3×, `#ffffff` 3×, `#facc15` 2×, `#6f6657` 2×, `#d0c5af`
4× even though `--text-muted-warm` exists.

### 7.2 Same role, different styles (the actual inconsistency)

| Role | Where | Size | Colour |
|---|---|---|---|
| Screen/modal title (pixel) | `.pixel-title` 2.5u (10px), `.equip-picker .pixel-modal-title` 2.75u (11px), `.pixel-modal-title` 12px | 10/11/12 | `--accent` |
| Big title (pixel) | `.place-card-title` 13px, `.fight-end-title` 14px, `.newui-header-*` 9px | 9/13/14 | `#fbbf24` / `--paper` / `#ffbf60` |
| Row/label text | `.team-card-name` 15px, `.mission-tabs .pixel-btn` 15px, `.action-btn-title` 4.5u (18px) | 15/15/18 | `--text-cream` / `#f7e6d4` / `#fef3c7` |
| Body | `.fight-end-row` 13px, `.action-btn-caption` 2.5u (10px), `.place-card-desc` 3.75u (15px) | 10/13/15 | mixed |
| Micro caption | `.action-btn-caption` 10px uppercase, `.place-card-subtitle` 12px uppercase | 10/12 | `rgba(253,230,138,.5)` / `.6` |

### 7.3 Unification plan

**Font tokens** (in `:root`):

```css
--font-display: 'Press Start 2P', var(--font-pixel);   /* titles, numbers */
--font-body:    'VT323', var(--font-pixel);            /* every line of copy */
--font-pixel:   'FFTA2', 'FFTA', ui-monospace, monospace; /* brand/menus */
--font-icon:    'Material Symbols Outlined', sans-serif;
```
Drop `'Space Mono'` (unbundled, 9 uses → `--font-display` for the chips) and
remove the duplicate `@font-face` / unused `Zilvertype`.

**Size scale** (2px steps, tokens; replaces the 27 values):

```css
--text-2xs: 8px;   /* badges, micro labels */
--text-xs: 10px;   /* captions, uppercase micro */
--text-sm: 12px;   /* labels, row text (the body default) */
--text-md: 14px;   /* emphasis/body-large */
--text-lg: 16px;   /* card names, section titles */
--text-xl: 20px;   /* page hero (rare) */
/* display ramp (Press Start 2P is wider: separate steps) */
--display-sm: 9px; --display-md: 13px; --display-lg: 14px;
```

**One base class + role classes** (kills the 58+40 repeated resets):

```css
.pixel-text { font-family: var(--font-body); font-size-adjust: none;
              text-shadow: none; letter-spacing: 0; }
.pixel-title   { font-family: var(--font-display); text-transform: uppercase;
                 letter-spacing: 1px; color: var(--accent); }
.pixel-subtitle{ font-family: var(--font-body); font-size: var(--text-sm);
                 text-transform: uppercase; letter-spacing: 0.5px;
                 color: var(--text-dim); }
.pixel-label   { font-size: var(--text-sm); color: var(--text-warm); }
.pixel-body    { font-size: var(--text-md); color: var(--text); }
.pixel-caption { font-size: var(--text-xs); text-transform: uppercase;
                 letter-spacing: 0.5px; color: var(--text-dim); }
.pixel-value   { font-size: var(--text-sm); color: var(--gold-strong); }
```

**Colour tokens to add** (semantic, from the raw ones in use):
`--success: #4ade80`, `--danger-soft: #f87171`, `--info: #60a5fa`,
`--text-warm-bright: #fef3c7`, `--text-link: #b7c6ee`; map `#f7e6d4` →
`--text-cream` and `#d0c5af` → `--text-muted-warm` (already exists).

**Migration order**
- [x] **F1** Font tokens + size scale added; every `font-family` repointed at a
      token (`--font-body` 54×, `--font-display` 25×, `--font-icon` 2×,
      `--font-pixel` 1×; distinct forms 13 → 6 including the `@font-face`
      literals).
- [x] **F2** The 58 `font-size-adjust: none` and 40 `text-shadow: none`
      declarations were collected into one grouped rule per property (per file)
      — computed styles unchanged, 98 declarations gone. `.pixel-text` exists as
      the documented base for new code.
- [x] **F3** All 163 `font-size` declarations use the scale tokens — **27 → 15
      distinct values** (7 body ramp + 7 display ramp + the 32px icon chip).
- [x] **F4** `letter-spacing` 15 → 6 values (0 / 0.5px / 1px / −0.5 / −1 / −2.5),
      `font-weight` 5 → 2 (400/700).
- [x] **F5** Semantic colour tokens added (`--success`, `--danger-soft`,
      `--info`, `--text-link`, `--text-warm-bright`, `--text-dim-warm`) and the
      duplicate raw hexes mapped (`#f7e6d4` → `--text-cream`, `#d0c5af` →
      `--text-muted-warm`, …).
- [x] **F6** 9 of the 21 inline `fontSize`/`fontFamily` styles replaced with the
      role classes (`.pixel-caption`, `.pixel-label`); the 12 left are in dev
      screens (`screens/dev/*`) and keep their one-off sizes.
- [x] **F7** `'Space Mono'` uses → `--font-display` (the face was never
      bundled). **Correction:** `@font-face 'FFTA'` twice is intentional — the
      second is `Zilvertype.ttf` restricted to digits (`unicode-range`), so
      Zilvertype IS used and stays.
- [x] **F8** Verified with headless screenshots: Order Camp place page, the
      intro dialogue and the JRPG Battle dev arena all render correctly (icon
      font glyphs included). Accepted size snaps: 11→12, 13→14, 15→16, 18→16.

**Role classes now in `pixelUI.css`** (the sizes above are the actual final
values): `.pixel-text`, `.pixel-title`, `.pixel-subtitle`, `.pixel-label`,
`.pixel-body`, `.pixel-caption`, `.pixel-value`.

**Incidents during the sweep (fixed):** the raw-hex pass also rewrote the
`@font-face` family names (browsers reject `var()` there → the icon font broke)
and the new token definitions themselves (`--success: var(--success)`) — both
restored and verified. Lesson: the sweep scripts must skip `@font-face` and
`:root` declarations.

---

## 8. Code health review — deprecated / dead / does not fit

Scanned `worldTest/web/src`, `worldTest/core`, `worldTest/` legacy dirs, `src/`
and the configs. Findings ordered by impact.

### 8.1 Deprecated systems still in the tree

- [x] **R1 LEGACY CLI APP (~2,761 lines) — not built, not typechecked.**
      `worldTest/{Game, menu, NPC, Places, Quests, InitialData, Combat, UI,
      Utils}` + `worldTest/index.ts`, run only by `npm run world:test` via
      `tsx` (transpile-only). It imports the old library combat classes
      (`CombatEngine`, `CombatController`) and the root `tsconfig.json` only
      includes `src/**` — so nothing verifies it. Either delete it or move it
      to a `legacy/` folder with a README stating it is unmaintained.
- [ ] **R2 ORPHANED INTERVAL COMBAT SYSTEM.** `core/config/intervalBattle.ts`
      (`INTERVAL_BATTLE` + its builder are referenced only inside the file),
      `core/config/intervalStressTest.ts`, `core/config/battleLayout.ts`
      (only re-exported from `config/index.ts`),
      `core/combat/battleTracker.ts::trackIntervalRecord` (exported, zero
      callers) and its `IntervalActionRecord` import — the only remaining use of
      the library's `IntervalCombat`. The app runs `HybridCombat` only. The
      dev Stress page builds its own armies and does not use these configs.
- [ ] **R3 LEGACY SAVE SHIMS.** `core/config/characters.ts` (`LEGACY_PROFILES`,
      `buildCharacterById`, `flatExperience`) and
      `core/equipment/loadout.ts::migrateLegacyEquipment` (called from
      `session.ts` ×3 and `world.ts` ×1). Needed only for saves made before the
      loadout/jobs systems; decide a save-version cutoff and keep or drop them.
- [ ] **R4 OLD SPRITE ART.** `assets/characters/{archer_idle, archer_attack,
      warrior_idle, warrior_attack}.webp` are superseded by the `*_idle_2`
      art and no longer referenced (the old attack sheets were removed from the
      catalog). Also unused: `caw_borderless.webp`, `Sin título-5.webp`, the
      unpacked `maps/map_assets/**` pack and the individual `icons/*.png`
      files. Keep what is reference material in a `reference/` folder, delete
      the rest.

### 8.2 Leftovers in shipped code

- [x] **R5 DEBUG LOG.** `components/character/TeamData.tsx:36`:
      `console.log("hola", character.stats.mana)`.
- [x] **R6 DEAD PROP.** `BattleCard` accepts `sub` (and `BattleUnit.sub`) but
      never renders it.
- [x] **R7 DEAD CSS + COMMENTED MARKUP.** `.battle-card-name` (its JSX is
      commented out in `BattleCard`), the commented `<div className="pixel-title">`
      in `Battlefield`, and **27 commented-out declarations** in `pixelUI.css`
      (e.g. `/* padding: var(--s4) 0; */`).
- [x] **R8 EXPORT HYGIENE.** ~30 exports are used only inside their own file
      (or nowhere): `trackIntervalRecord` (fully dead), `resolvePortrait`,
      `colorKey`/`countryAt` (mask), `hitsOn`/`SelectionKind` (targeting),
      `UI_CANVAS`/`UI_MAX_SCALE`/`computeUiScale` (uiScale),
      `DEFAULT_EFFECTS`, `JOB_SPRITE_ROLES`/`spriteRoleOfJob`/`isSpriteRole`,
      `ICONS`/`ICON_SHEETS`/`ICON_SIZE`/`ICON_GRID`, `DEFAULT_PLACE_IMAGE`,
      `DAMAGE_COLORS`, `BattleReportSide`, `ForecastAttack`/`ForecastDamageKind`/
      `hitRateOf`, `WorldMapProps`, `CountryData`, `StatEntry`, `Route`,
      `ActionButtonProps`, `ActionSvgIcon`, `ButtonSizeLine`,
      `DESCRIPTION_COLS`/`wrapChunk`, `rowOfPosition`.

### 8.3 Does not fit / stale

- [x] **R9 DEV TOOLS SHIP IN PRODUCTION.** `NewUiRouter` always renders the
      **Dev Tools** menu (9 screens, 1,606 lines: Stress 80×80, Reset Game,
      Damages, Items, Flags…). There is no `import.meta.env.DEV` guard anywhere
      in the app. Gate the dev pages behind `import.meta.env.DEV` (or a URL
      flag) so the production bundle drops them.
- [x] **R10 STALE COMMENTS.** `pixelUI.css:509` says the legacy screens "stay
      reachable at ?ui=0" — the legacy UI is gone (`App.tsx` mounts
      NewUiRouter only) and no `ui=0` handler exists; `pixelUI.css` also says
      "the legacy MessageBox is not mounted here" while `NewUiRouter` mounts
      it; `BattleCard`'s header still describes the old 64×16/4-frame render.
- [x] **R11 MISNAMED FILES.** `worldTest/Quests/FightGoblin.test.ts` and
      `GeneralTesting.test.ts` are quest classes, not tests; jest's testRegex
      matches `.test.ts` but `testPathIgnorePatterns` excludes `/worldTest/`, so
      they are silently ignored (and the repo currently has no runnable tests).

### 8.4 Config gaps (what lets the above in)

- [x] **R12 LINT/TYPE GATES ARE LOOSE.** `.eslintrc.json` sets
      `no-unused-vars: "off"`; `worldTest/web/tsconfig.json` sets
      `noUnusedLocals: false` and `noUnusedParameters: false`; there is no
      `eslint-plugin-react-hooks` (hook dependency arrays are unlinted); the
      root `lint` script only covers `src --ext .ts`, so `worldTest/**` and all
      `.tsx` are never linted. Turning these on would have caught R5/R6/R8.

### 8.5 Results of the cleanup pass

- **Kept on purpose (per request):** R2 (the interval fight system) and R4 (the
  old art assets) stay untouched.
- **Kept as needed:** R3 (the legacy save shims still load pre-loadout saves).
- **Deleted:** the legacy CLI app — `worldTest/{index.ts, augmentations.ts,
  Game, menu, NPC, Places, Quests, InitialData, Combat, UI, Utils}` (~2,761
  lines) and the `world:test` npm script. R11's misnamed quest "tests" went with
  it.
- **Removed:** the `console.log` (R5); the dead `name`/`sub` props of
  `BattleCard` and their `BattleUnit` pass-through (R6); `.battle-card-name`,
  the commented `<div className="pixel-title">` in `Battlefield` and **19**
  commented-out CSS declarations (R7); ~30 internal-only exports plus the dead
  helpers `colorKey`, `countryAt`, `hitsOn`, `ICON_SIZE`, `trackIntervalRecord`
  stays (interval kept) (R8).
- **Dev tools (R9):** `NewUiRouter` now gates the whole dev section behind
  `import.meta.env.DEV` with lazy `import()` loaders — the menu entry, the
  pages and the chunks disappear from production. Main JS bundle:
  **484.8 kB → 452.3 kB**; `dist/` has no dev chunks.
- **Comments (R10):** the `?ui=0` claim, the "legacy MessageBox" note and the
  old 4-frame render description are fixed.
- **Gates (R12):** web `tsconfig` now has `noUnusedLocals` +
  `noUnusedParameters`; ESLint runs `@typescript-eslint/no-unused-vars`
  (`^_` allowed); a `lint` script was added to `worldTest/web/package.json`;
  `jest` gets `passWithNoTests`. The fallout: 28 unused symbols removed/renamed
  across web, core and the library, then `eslint --fix` over the whole web
  source (it had never been linted — quotes/indent/comma fixes).
- **Bonus find:** `JrpgArena` computed the whole arena **camera**
  (`scale/tx/ty`, plus a `useLayoutEffect` measuring the arena) but never
  applied it — the `.jrpg-camera` element had no transform. The transform is now
  wired (`translate(...) scale(...)`), which enables the documented zoom-out for
  crowded formations.
- **New finding — R13 STALE TEST SUITE.** The repo *does* have tests
  (`test/`, 65 suites, 475 tests — my earlier R11 note was wrong: they live at
  the repo root, not in `worldTest/`). **12 suites / 33 tests fail** because they
  assert pre-refactor behaviour (e.g. `mana` default 30 vs the current 0, jobs,
  taunt, fainting, growth). They are not part of any build gate. Decide: delete
  the folder, or keep it as a snapshot of the old engine.





