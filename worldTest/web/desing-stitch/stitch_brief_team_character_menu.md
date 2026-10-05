# Design Brief — RPG-TS: Team, Character & Menu pages

You previously designed our "The Lord's Farm" place page (hero, descriptive
card, tactical action tray) and the 48px status header. We adopted them:
header, place card, action buttons (icon slot + VT323 title + caption), the
bevel recipe and the fonts. Now design the next three screens in the SAME
system. Do NOT invent game content (no weather, tax, stamina, threat
ratings) — only the real data listed below.

## Fixed canvas & unit system

- The game renders inside a fixed 320x640 logical canvas (scaled by an
  integer multiplier on the device). Everything is sized in UI units:
  1 unit (--u) = 4px. Ladder: --s1 4 / --s2 8 / --s3 12 / --s4 16 /
  --s5 20 / --s6 24 / --s8 32 / --s10 40 / --s12 48 / --s14 56 /
  --s16 64 / --s48 192.
- The 48px status header (already shipped) is ALWAYS on top of every page:
  hamburger (32px, 3 amber bars) | center: EL FERGEL + zone badge over
  "DAY n | G gold | season icon" | right: RPG-TS + SAVE: OK.
- The bottom action tray is a fixed 192px panel with a 2-column grid
  (capacity 6 = 3 rows). A text banner may span slots 1-2 of the first
  page; Back lives at slot 5; the last option can be pinned to slot 6.
  Buttons: icon slot 26px (dark inset square) + VT323 18px amber title
  + VT323 10px uppercase amber-50% caption, on the tactical bevel.

## Design tokens & fonts (already in the project)

Palette: bg #140c0c, card #2c1515, card-2 #261010, border #120505,
gold #f2a63b / #fbbf24, amber-100 #fef3c7, amber-200 #fde68a,
amber-300 #fcd34d, amber-400 #fbbf24, text #eedbcc, muted #9e8179,
green accent #387346, teal #1b4b52, danger red #3d1616.
Fonts: 'Press Start 2P' (wide pixel titles, 9-13px), 'VT323' (body &
button text, 10-18px), 'FFTA2'/'FFTA' (in-game pixel text).
Button recipe (exact):
  background #3b1c1c; border 2px #5a2e2e;
  box-shadow inset 2px 2px 0 #703d3d, inset -2px -2px 0 #1a0a0a,
  inset 3px 3px 0 rgba(255,255,255,.08), inset -3px -3px 0 rgba(0,0,0,.6),
  0 0 0 1px #050202;
  hover: bg #462222 border #723c3c; active: bg #251010, translate(1px,2px),
  inverted bevel. Primary variant (green): bg #2a3a1f border #4a6635,
  insets #638c45 / #111a0c.

## Page 1 — Team page (real structure)

- Squad roster: the active party as a grid of character cards. Real card
  data: portrait sprite, name, job name, level. Selecting a card opens
  the character data below/next.
- Character data panel (selected member): portrait, name, level, job,
  stat columns (HP, attack, defence, magic attack, magic defence, speed,
  crit chance, crit multiplier), equipment loadout (5 holes — a hole
  holds one item or is empty "Vacío"), active statuses (buffs/debuffs
  with their names).
- Equipment flow (keep this interaction): an "Equipo" action opens a
  5-slot loadout view whose action bar lists the slots; tapping a hole
  opens an item picker modal with section tabs: espadas (Armas de filo),
  varas (Armas contundentes), arcos (Armas arrojadizas), cascos
  (Protección cabeza), ropa (Protección torso), escudos (Escudos),
  accesorios (Accesorios). Item rows: icon, name, in-use/total counts;
  tapping a row previews its stats in a side column; rows the character
  cannot equip (job restriction) read disabled.

## Page 2 — Character page

- Full character sheet as its own screen: portrait, name, job icon and
  job name, level, the stat columns, the 5 equipment holes, statuses.
- Must use the same panel/card language as the Team page so the two
  screens feel like one system.

## Page 3 — Menu page

- A modal menu (currently a plain list): entries = Place, Team,
  World Map, Actions, Stress 80v80, Fight Gen, Damages.
- Style it as a bevel panel with rows: icon slot + VT323 title + optional
  caption, close button (top-right, 24px tactical square). No new pages,
  only these seven rows.

## Deliverable

For each page: (1) the HTML structure with the unit math (row heights
that sum exactly, e.g. header 48 + content + tray 192 = 640), (2) a
ready-to-copy CSS block in the same format as your previous
"Production CSS Variables & Bevel Recipe" section, reusing the tokens
above — no Tailwind-only utilities in the final copy, plain CSS classes
like the ones we ship (pixel-btn, action-btn, pixel-inset, ...).
Keep every border 1px black hairline + inner bevel, image-rendering
pixelated, no blur, no invented data.
