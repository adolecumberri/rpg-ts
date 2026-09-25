import type { InventorySlot, Team } from '../../src';
import type { ShopEntry } from './types';
import { canAddItem } from './inventory';

export function buyItem(team: Team, entry: ShopEntry): 'ok' | 'no_gold' | 'inventory_full' {
    if (team.gold < entry.buyPrice) {
        return 'no_gold';
    }
    if (!canAddItem(team, entry.item)) {
        return 'inventory_full';
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
