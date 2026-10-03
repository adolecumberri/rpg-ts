import type { EquipOutcome } from '@core';

/**
 * The user-facing texts of the equipment flow — the ONLY place the UI
 * wording lives. The engine returns EquipOutcome codes; this table
 * translates them (and later becomes the per-language tables).
 */
export const EQUIP_MESSAGES: Record<EquipOutcome, string> = {
    'ok': '',
    'not-equippable': 'This item cannot be equipped.',
    'job-refused': 'Your job does not allow you to equip this.',
    'capacity-full': 'There is no room for this equipment.',
    'two-hands': 'The weapon occupies both hands.',
    'no-copies': 'There are no pieces of equipment available.',
    'unknown-slot': 'Unknown slot.',
    'empty-slot': 'Nothing equipped in this slot.',
};

/** The message an operation result shows (silent on success). */
export function messageOf(code: EquipOutcome): string {
    return EQUIP_MESSAGES[code] ?? '';
}
