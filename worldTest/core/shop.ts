import type { InventorySlot, Team } from '../../src';
import type { ShopEntry } from './types';

// The shop stock is empty for the rebuild: the buy/sell flow is the
// structure, the stock itself is content.
export const SHOP_STOCK: ShopEntry[] = [];

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
