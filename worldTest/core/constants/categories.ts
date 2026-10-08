// The item category dictionary: every legal value of the library's
// ItemCategory, referenced as CATEGORIES.armor instead of raw strings.
// The string values match the library's union exactly (they get
// serialized into saves).

export const CATEGORIES = {
    equipment: 'equipment',
    weapon: 'weapon',
    magic_weapon: 'magic_weapon',
    ranged_weapon: 'ranged_weapon',
    armor: 'armor',
    consumable: 'consumable',
    quest: 'quest',
    key: 'key',
    utility: 'utility',
} as const;

export type CategoryId = typeof CATEGORIES[keyof typeof CATEGORIES];
