import type { Item } from '../../src';
import type { ItemCategory } from '../../src/classes/items/Item';
import { ItemTable } from './loot/itemTable';

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
// Item catalog. Empty for the rebuild: the data-driven ItemTable is the
// structure, the items themselves are recreated as content.
// ---------------------------------------------------------------------------
export const DEFAULT_ITEM_TABLE = new ItemTable();
