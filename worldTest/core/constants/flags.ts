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
    // Act 1 story markers: the opening, the branch choice and the
    // training trail.
    NEW_GAME: 'new_game',
    BRANCH_CHOSEN: 'branch_chosen',
    BRANCH_ARCHER: 'branch_archer',
    BRANCH_SOLDIER: 'branch_soldier',
    BRANCH_MAGE: 'branch_mage',
    // The map opens once the training proves the recruit.
    MAP_UNLOCKED: 'map_unlocked',
    // One flag per won sparring match (the training outcome memory).
    TRAINING_WON_SOLDIER: 'training_won_soldier',
    TRAINING_WON_MAGE: 'training_won_mage',
    TRAINING_WON_ARCHER: 'training_won_archer',
    TRAINING_WON_CAPTAIN: 'training_won_captain',
    TRAINING_COMPLETED: 'training_completed',
    CAZA_COMPLETED: 'caza_completed',
} as const;

export type FlagId = typeof FLAGS[keyof typeof FLAGS];
