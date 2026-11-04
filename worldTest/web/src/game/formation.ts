// Count-driven battlefield formations. Pure data + geometry: no React,
// no DOM. The arena places each fighter from the formation table below
// and the layout function; nothing here depends on job or row state.

/** The largest hand-designed formation per side (13+ is auto-battle territory). */
export const MAX_FORMATION_SIZE = 12;

/** Units per row, front row first. */
export type Formation = readonly number[];

/** One formation slot: row 0 is the front row, lane is centered on 0. */
export type FormationSlot = {
    row: number;
    lane: number;
};

export type FormationSide = 'ally' | 'enemy';

/** One placed fighter, in arena design pixels (feet anchor). */
export type FormationPlacement = {
    x: number;
    y: number;
    row: number;
    lane: number;
};

// The tilted ground plane's usable feet band and the vertical skirmish
// line (the ground is 380px wide at left -30, so its center is 160).
export const GROUND_TOP = 174;
export const GROUND_BOTTOM = 364;
export const GROUND_CENTER = (GROUND_TOP + GROUND_BOTTOM) / 2;
export const CENTER_X = 160;
// The clear gap between the two sides' front rows.
export const CENTER_GAP = 28;
// The distance between the rows of one side.
export const ROW_GAP = 56;
// The sprite render box (design px; the entity CSS draws it at 2x).
export const SPRITE_BOX = 28;
// Minimum lane pitch: units in one row must not overlap. The maximum is
// whatever the ground band can give: rows spread across the whole band.
const LANE_MIN_PITCH = SPRITE_BOX + 4;

// n -> rows, front first. Three units is deliberately one front + two
// back; the other shapes are authored so gameplay fights (<=6) and the
// dev sweep (<=12) both use the floor.
const FORMATIONS: Record<number, Formation> = {
    1: [1],
    2: [2],
    3: [1, 2],
    4: [2, 2],
    5: [3, 2],
    6: [3, 3],
    7: [4, 3],
    8: [4, 4],
    9: [3, 3, 3],
    10: [4, 3, 3],
    11: [4, 4, 3],
    12: [4, 4, 4],
};

/** The formation for a count, or undefined when there is no designed shape. */
export function formationFor(count: number): Formation | undefined {
    return FORMATIONS[count];
}

/** The sprite box for a side of this size (same box for now at every count). */
export function spriteBoxFor(_count: number): number {
    return SPRITE_BOX;
}

/** The vertical distance between two lanes of the same row. */
export function lanePitchFor(count: number): number {
    const formation = formationFor(count);
    if (!formation) return 0;
    const maxLanes = Math.max(...formation);
    if (maxLanes <= 1) return 0;
    const available = GROUND_BOTTOM - GROUND_TOP - SPRITE_BOX;
    const pitch = available / (maxLanes - 1);
    return Math.max(LANE_MIN_PITCH, pitch);
}

/**
 * The slots of a formation in party order. Row 0 is the front row; slots
 * inside a row run left-to-right for allies. Rows with different counts
 * are naturally offset; equal-count rows align into a grid.
 */
export function formationSlotsFor(count: number): FormationSlot[] | undefined {
    const formation = formationFor(count);
    if (!formation) return undefined;
    const slots: FormationSlot[] = [];
    formation.forEach((units, row) => {
        for (let index = 0; index < units; index++) {
            slots.push({
                row,
                lane: index - (units - 1) / 2,
            });
        }
    });
    return slots;
}

/**
 * The feet positions of a side's formation. The front row sits
 * CENTER_GAP from the skirmish line; each next row steps outward. The
 * side only flips the x sign, so both armies read as a mirror. The y
 * lane is centered on the ground band and clamped so no feet leave the
 * floor.
 */
export function layoutFormation(count: number, side: FormationSide): FormationPlacement[] | undefined {
    const slots = formationSlotsFor(count);
    if (!slots) return undefined;
    const pitch = lanePitchFor(count);
    const sideSign = side === 'ally' ? 1 : -1;
    return slots.map((slot) => {
        const rawY = GROUND_CENTER + slot.lane * pitch;
        return {
            x: CENTER_X - sideSign * (CENTER_GAP + slot.row * ROW_GAP),
            y: Math.min(GROUND_BOTTOM - 6, Math.max(GROUND_TOP + 8, rawY)),
            row: slot.row,
            lane: slot.lane,
        };
    });
}
