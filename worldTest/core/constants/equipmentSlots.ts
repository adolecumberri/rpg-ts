// The legacy equipment slot dictionary (the library's EquipmentSlot):
// weapon, armor, accessory and the bag. Content references slots only
// through these constants (EQUIPMENT_SLOTS.armor).

export const EQUIPMENT_SLOTS = {
    weapon: 'weapon',
    armor: 'armor',
    accessory: 'accessory',
    bag: 'bag',
} as const;

export type EquipmentSlotId = typeof EQUIPMENT_SLOTS[keyof typeof EQUIPMENT_SLOTS];
