import { Item } from '../../../src';
import type { Character } from '../../../src';
import type { ItemCategory, ItemEffect, ItemElement } from '../../../src/classes/items/Item';
import type { EquipmentSlot } from '../../../src/classes/items/EquipmentManager';

/**
 * Data-driven item definition. Items are created from these entries
 * instead of hardcoded factories, so the table can be extended
 * (loot, shops, quests...) without writing code.
 */
export type ItemTableEntry = {
    id: string;
    name: string;
    description?: string;
    category?: ItemCategory;
    slot?: EquipmentSlot;
    effects?: ItemEffect[];
    elements?: ItemElement[];
    buyValue?: number;
    sellValue?: number;
    onUse?: (self: Item, target: Character) => boolean;
};

export class ItemTable {
    private entries: Map<string, ItemTableEntry> = new Map();

    register(entry: ItemTableEntry): void {
        if (this.entries.has(entry.id)) {
            throw new Error(`Item '${entry.id}' is already registered.`);
        }
        this.entries.set(entry.id, entry);
    }

    has(id: string): boolean {
        return this.entries.has(id);
    }

    get(id: string): ItemTableEntry | undefined {
        return this.entries.get(id);
    }

    getAll(): ItemTableEntry[] {
        return Array.from(this.entries.values());
    }

    createItem(id: string): Item {
        const entry = this.entries.get(id);
        if (!entry) {
            throw new Error(`Item '${id}' is not registered in the item table.`);
        }
        return new Item({ ...entry });
    }
}
