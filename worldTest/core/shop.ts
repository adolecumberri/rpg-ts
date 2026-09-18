import type { InventorySlot, Team } from '../../src';
import {
    makeCursedRing,
    makeFireStaff,
    makeHealthPotion,
    makeIceBlade,
    makeLongbow,
    makeRustySword,
    makeWoodenShield,
} from './items';
import type { ShopEntry } from './types';

// The shop sells at least one item of every category, so every
// section (weapons, ranged weapons, magic weapons, armor, consumables)
// is represented.
export const SHOP_STOCK: ShopEntry[] = [
    { item: makeRustySword(), buyPrice: 50, sellPrice: 25 },
    { item: makeLongbow(), buyPrice: 80, sellPrice: 40 },
    { item: makeFireStaff(), buyPrice: 120, sellPrice: 60 },
    { item: makeIceBlade(), buyPrice: 90, sellPrice: 45 },
    { item: makeWoodenShield(), buyPrice: 40, sellPrice: 20 },
    { item: makeCursedRing(), buyPrice: 40, sellPrice: 32 },
    { item: makeHealthPotion(), buyPrice: 10, sellPrice: 5 },
];

export function buyItem(team: Team, entry: ShopEntry): 'ok' | 'no_gold' {
    if (team.gold < entry.buyPrice) {
        return 'no_gold';
    }

    team.gold -= entry.buyPrice;
    team.inventory.addItem(entry.item);
    return 'ok';
}

export function sellItem(team: Team, slot: InventorySlot): boolean {
    if (slot.quantity <= 0) {
        return false;
    }

    team.gold += slot.item.sellValue;
    team.inventory.removeItem(slot.item.id, 1);
    return true;
}
