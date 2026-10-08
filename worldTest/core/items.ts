import type { Item } from '../../src';
import type { ItemCategory } from '../../src/classes/items/Item';
import { ItemTable } from './loot/itemTable';
import type { ItemTableEntry } from './loot/itemTable';
import { Items } from './constants/items';

// ---------------------------------------------------------------------------
// Category presentation (shop / inventory sections)
// ---------------------------------------------------------------------------
export const CATEGORY_SECTIONS: Partial<Record<ItemCategory, string>> = {
    weapon: 'Weapons',
    ranged_weapon: 'Ranged Weapons',
    magic_weapon: 'Magic Weapons',
    armor: 'Armor',
    consumable: 'Consumables',
    quest: 'Quest Items',
    key: 'Keys',
    utility: 'Utility',
    equipment: 'Equipment',
};

export const CATEGORY_ICONS: Partial<Record<ItemCategory, string>> = {
    weapon: '🗡️',
    ranged_weapon: '🏹',
    magic_weapon: '🪄',
    armor: '🛡️',
    consumable: '🧪',
    quest: '📜',
    key: '🔑',
    utility: '🧰',
    equipment: '🗡️',
};

export function sectionOf(category: ItemCategory): string {
    return CATEGORY_SECTIONS[category] ?? 'Other';
}

export function groupItemsBySection<T extends { item: Item }>(entries: T[]): { title: string; entries: T[] }[] {
    const groups: { title: string; entries: T[] }[] = [];
    for (const entry of entries) {
        const title = sectionOf(entry.item.category);
        let group = groups.find((g) => g.title === title);
        if (!group) {
            group = { title, entries: [] };
            groups.push(group);
        }
        group.entries.push(entry);
    }
    return groups;
}

// ---------------------------------------------------------------------------
// The global item table: the runtime dictionary every system resolves
// items through (inventory, loot, shops, saves, the character
// generator). Its single source is the Items constant dictionary in
// constants/items.ts — every entry is registered from there, so the
// references and the definitions can never drift.
// ---------------------------------------------------------------------------
export const DEFAULT_ITEM_TABLE = new ItemTable();

for (const entry of Object.values(Items) as ItemTableEntry[]) {
    DEFAULT_ITEM_TABLE.register(entry);
}
