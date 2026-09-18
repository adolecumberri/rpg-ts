import type { ItemTableEntry } from '../loot/itemTable';

// Fixed values for the Fire Sword item.
// It converts the wielder's whole attack into fire and adds 12 damage.
export const FIRE_SWORD_ENTRY: ItemTableEntry = {
    id: 'fire_sword',
    name: 'Fire Sword',
    category: 'weapon',
    slot: 'weapon',
    description: 'A blade wreathed in flame. Converts your attack into fire and adds 12 damage.',
    buyValue: 100,
    sellValue: 50,
    elements: [{ element: 'fire', attackValue: 12, convertsAttack: true }],
};
