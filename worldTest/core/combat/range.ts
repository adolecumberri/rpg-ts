import type { Character } from '../../../src';
// Pulls in the interface merges (rangeOf on Statistics/ItemDefinition).
import '../config/damage';

// ---------------------------------------------------------------------------
// Rows and attack reach. A battle formation has three rows (front,
// center, back); a character's row comes from its position in the team
// order (2 per row). Attack reach decides which ENEMY rows a fighter can
// hit: 'short' reaches the closest filled row, 'long' that row plus the
// next filled one, 'all' every row. Skills/spells default to 'all'.
// ---------------------------------------------------------------------------

export type RowPosition = 'front' | 'center' | 'back';

export type RangeOf = 'short' | 'long' | 'all';

// Rows in front-to-back order (index 0 = closest to the enemy).
export const ROWS: RowPosition[] = ['front', 'center', 'back'];

/** The character's own reach: its weapon's rangeOf, else its stat. */
export function effectiveRangeOf(character: Character): RangeOf {
    const weapon = character.equipment.getEquippedItems()
        .find((item) => item.definition.rangeOf);
    // rangeOf is a string stat with no modifiers: read it raw through
    // the enhanced Statistics (getStat is for numeric stats).
    return weapon?.definition.rangeOf ?? character.stats.rangeOf ?? 'short';
}

/**
 * The formation row a weapon reach belongs in: bows (all) stand in the
 * back row, staffs (long) in the center, and swords and bare hands up
 * front.
 */
export function rowForRange(range: RangeOf): RowPosition {
    if (range === 'all') return 'back';
    if (range === 'long') return 'center';
    return 'front';
}

/**
 * Moves the character to the row its reach belongs in. Called only
 * when the character is added to the team: the row comes from the
 * character's rangeOf (its weapon's reach, else its own stat) — 'all'
 * back, 'long' center, 'short' front. Anything the player arranges
 * afterwards (formation buttons, equips) is never overridden here.
 */
export function syncPositionToWeapon(character: Character): void {
    character.position = rowForRange(effectiveRangeOf(character));
}

/**
 * The enemy rows the given range can hit, given which enemy rows are
 * occupied. 'short': the closest filled row only. 'long': the closest
 * filled row plus the next filled one. 'all': every occupied row.
 */
export function reachableRows(range: RangeOf, occupiedRows: RowPosition[]): RowPosition[] {
    if (occupiedRows.length === 0) return [];
    if (range === 'all') return [...occupiedRows];

    const ordered = ROWS.filter((row) => occupiedRows.indexOf(row) !== -1);
    const closest = ordered[0];
    if (range === 'short') return [closest];

    const next = ordered.find((row) => row !== closest);
    return next ? [closest, next] : [closest];
}

export type RowEntry = { character: Character; row: RowPosition };

/**
 * The enemy characters a fighter can target, given its range and the
 * enemy formation (with rows). Used by the target pickers and the AI.
 */
export function reachableTargets(
    range: RangeOf,
    enemies: RowEntry[],
): Character[] {
    const occupied = ROWS.filter((row) =>
        enemies.some((entry) => entry.row === row && entry.character.stats.hp > 0),
    );
    const rows = reachableRows(range, occupied);
    return enemies.filter(
        (entry) => rows.indexOf(entry.row) !== -1 && entry.character.stats.hp > 0,
    ).map((entry) => entry.character);
}

/** Row entries of a team: each character's own chosen position. */
export function rowEntriesOf(team: Character[]): RowEntry[] {
    return team.map((character) => ({
        character,
        row: (character.position as RowPosition) ?? 'front',
    }));
}
