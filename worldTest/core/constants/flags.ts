// The story flags dictionary: named markers a mission leaves in the
// save when its reward step completes, so other content can ask "did X
// happen?" (dialogues, gated offers, place locks...). The constant
// identifiers are the code-side API; the string values are what gets
// serialized — they stay lowercase so old saves keep working.
//
// One flag per place: every place's lock checks its OWN flag, and the
// story opens them one by one. The dictionaries test fails on magic
// strings (same guard as the place locks).

export const FLAGS = {
    FARM_UNLOCKED: 'farm_unlocked',
    HAY_FIELD_UNLOCKED: 'hay_field_unlocked',
    NORTH_SETTLEMENT_UNLOCKED: 'north_settlement_unlocked',
    SOUTH_BEACH_UNLOCKED: 'south_beach_unlocked',
    EAST_FIELD_UNLOCKED: 'east_field_unlocked',
    FARO_UNLOCKED: 'faro_unlocked',
} as const;

export type FlagId = typeof FLAGS[keyof typeof FLAGS];
