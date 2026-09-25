import type { Item } from '../../src';
import type { ItemCategory } from '../../src/classes/items/Item';
import { StatusInstance } from '../../src/classes/StatusInstance';
import { ItemTable } from './loot/itemTable';
import { bleedingStatus } from './statuses';

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
// Item catalog. Act 1 content: the farmer's sack, the basic outfit and
// the farm task goods.
// ---------------------------------------------------------------------------
export const DEFAULT_ITEM_TABLE = new ItemTable();

DEFAULT_ITEM_TABLE.register({
    id: 'sack',
    name: 'Sack',
    category: 'equipment',
    slot: 'bag',
    description: 'A sturdy farmer sack.',
    bagSlots: 5,
    buyValue: 30,
    sellValue: 15,
});

DEFAULT_ITEM_TABLE.register({
    id: 'farmer_outfit',
    name: 'Farmer Outfit',
    category: 'armor',
    slot: 'armor',
    description: 'Simple clothes that keep the sun off.',
    effects: [{ stat: 'defence', typeOfModification: 'BUFF_FIXED', value: 1 }],
    buyValue: 10,
    sellValue: 5,
});

DEFAULT_ITEM_TABLE.register({
    id: 'wood',
    name: 'Wood',
    category: 'utility',
    description: 'Chopped from the forest edge.',
});

DEFAULT_ITEM_TABLE.register({
    id: 'hay',
    name: 'Hay',
    category: 'utility',
    description: 'Collected from the fields.',
});

DEFAULT_ITEM_TABLE.register({
    id: 'sickle',
    name: 'Sickle',
    category: 'weapon',
    slot: 'weapon',
    description: 'A curved blade for cutting hay. Hits inflict bleeding. The sickles mission needs one.',
    effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 4 }],
    // Every real hit (damage > 0 after reactions) applies Bleeding to
    // the defender. Reapplying replaces the current instance, so the 3
    // turn countdown restarts instead of stacking.
    onHit: (context) => {
        context.defender.statusManager.addStatusInstance(
            new StatusInstance({ definition: bleedingStatus() }),
        );
    },
    buyValue: 5,
    sellValue: 2,
});

DEFAULT_ITEM_TABLE.register({
    id: 'stick',
    name: 'Stick',
    category: 'weapon',
    slot: 'weapon',
    description: "A goblin's club. +1 attack.",
    effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 1 }],
});
