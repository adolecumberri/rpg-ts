// The five-hole loadout slot dictionary: the kinds an equipped item
// occupies in the new UI (LOADOUT_SLOTS.clothes). Content references
// them only through these constants.

export const LOADOUT_SLOTS = {
    weapon: 'weapon',
    offhand: 'offhand',
    helmet: 'helmet',
    clothes: 'clothes',
    accessory: 'accessory',
} as const;

export type LoadoutSlotId = typeof LOADOUT_SLOTS[keyof typeof LOADOUT_SLOTS];
