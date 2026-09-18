import { Item } from '../../src';
import type { ItemCategory } from '../../src/classes/items/Item';
import { ItemTable } from './loot/itemTable';
import { FIRE_SWORD_ENTRY } from './config/fireSword';

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
// Item catalog (data-driven: registered in a shared ItemTable)
// ---------------------------------------------------------------------------
export const DEFAULT_ITEM_TABLE = new ItemTable();

DEFAULT_ITEM_TABLE.register({
    id: 'rusty_sword',
    name: 'Rusty Sword',
    category: 'weapon',
    slot: 'weapon',
    description: 'An old but serviceable blade.',
    buyValue: 50,
    sellValue: 25,
    effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 2 }],
});

DEFAULT_ITEM_TABLE.register({
    id: 'longbow',
    name: 'Longbow',
    category: 'ranged_weapon',
    slot: 'weapon',
    description: 'Keeps enemies at a distance.',
    buyValue: 80,
    sellValue: 40,
    effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 3 }],
});

DEFAULT_ITEM_TABLE.register({
    id: 'fire_staff',
    name: 'Fire Staff',
    category: 'magic_weapon',
    slot: 'weapon',
    description: 'Crackles with contained flame.',
    buyValue: 120,
    sellValue: 60,
    effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 5 }],
    elements: [{ element: 'fire', attackValue: 8 }],
});

DEFAULT_ITEM_TABLE.register({
    id: 'ice_blade',
    name: 'Ice Blade',
    category: 'magic_weapon',
    slot: 'weapon',
    description: 'Bites with winter cold.',
    buyValue: 90,
    sellValue: 45,
    effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 2 }],
    elements: [{ element: 'ice', attackValue: 6 }],
});

DEFAULT_ITEM_TABLE.register(FIRE_SWORD_ENTRY);

DEFAULT_ITEM_TABLE.register({
    id: 'wooden_shield',
    name: 'Wooden Shield',
    category: 'armor',
    slot: 'armor',
    description: 'Basic wooden protection.',
    buyValue: 40,
    sellValue: 20,
    effects: [{ stat: 'defence', typeOfModification: 'BUFF_FIXED', value: 5 }],
    elements: [{ element: 'fire', resistanceValue: 4 }],
});

DEFAULT_ITEM_TABLE.register({
    id: 'cursed_ring',
    name: 'Cursed Ring',
    category: 'magic_weapon',
    slot: 'accessory',
    description: 'Power at a price.',
    buyValue: 40,
    sellValue: 32,
    effects: [
        { stat: 'attack', typeOfModification: 'BUFF_PERCENTAGE', value: 20 },
        { stat: 'hp', typeOfModification: 'DEBUFF_PERCENTAGE', value: 30 },
    ],
    elements: [{ element: 'lightning', resistanceValue: 5 }],
});

DEFAULT_ITEM_TABLE.register({
    id: 'health_potion',
    name: 'Health Potion',
    category: 'consumable',
    description: 'Restores 30 HP.',
    buyValue: 10,
    sellValue: 5,
    onUse: (_self, target) => {
        target.stats.hp = Math.min(target.stats.totalHp, target.stats.hp + 30);
        target.stats.isAlive = target.stats.hp > 0 ? 1 : 0;
        return true;
    },
});

DEFAULT_ITEM_TABLE.register({
    id: 'cave_key',
    name: 'Cave Key',
    category: 'key',
    description: 'Opens the entrance to the Misty Cave.',
});

export function makeRustySword(): Item {
    return DEFAULT_ITEM_TABLE.createItem('rusty_sword');
}

export function makeLongbow(): Item {
    return DEFAULT_ITEM_TABLE.createItem('longbow');
}

export function makeFireStaff(): Item {
    return DEFAULT_ITEM_TABLE.createItem('fire_staff');
}

export function makeIceBlade(): Item {
    return DEFAULT_ITEM_TABLE.createItem('ice_blade');
}

export function makeFireSword(): Item {
    return DEFAULT_ITEM_TABLE.createItem('fire_sword');
}

export function makeWoodenShield(): Item {
    return DEFAULT_ITEM_TABLE.createItem('wooden_shield');
}

export function makeCursedRing(): Item {
    return DEFAULT_ITEM_TABLE.createItem('cursed_ring');
}

export function makeHealthPotion(): Item {
    return DEFAULT_ITEM_TABLE.createItem('health_potion');
}

export function makeCaveKey(): Item {
    return DEFAULT_ITEM_TABLE.createItem('cave_key');
}
