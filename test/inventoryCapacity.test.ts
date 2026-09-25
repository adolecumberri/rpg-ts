import { Character, Item, Team } from '../src';
import type { ItemDefinition } from '../src/classes/items/Item';
import { INVENTORY } from '../worldTest/core/config/inventory';
import {
    addItemCapped,
    canAddItem,
    inventoryCapacity,
    inventorySlotCount,
} from '../worldTest/core/inventory';
import { buyItem } from '../worldTest/core/shop';
import type { ShopEntry } from '../worldTest/core/types';

type BagDefinition = ItemDefinition & { bagSlots?: number };

function item(id: string): Item {
    return new Item({ id, name: id, category: 'consumable' });
}

function bag(slots: number): Item {
    return new Item({ id: 'sack', name: 'Sack', category: 'equipment', slot: 'bag', bagSlots: slots } as BagDefinition);
}

function entry(id: string): ShopEntry {
    return { item: item(id), buyPrice: 1, sellPrice: 1 };
}

describe('inventory capacity', () => {
    it('starts with the configured base slots', () => {
        const team = new Team();
        expect(inventoryCapacity(team)).toBe(INVENTORY.baseSlots);
        expect(inventorySlotCount(team.inventory)).toBe(0);
    });

    it('stacking copies never consumes extra slots', () => {
        const team = new Team();
        expect(addItemCapped(team, item('wood'))).toBe(true);
        expect(addItemCapped(team, item('wood'), 3)).toBe(true);
        expect(inventorySlotCount(team.inventory)).toBe(1);
    });

    it('blocks new item types once the capacity is reached', () => {
        const team = new Team();
        for (let index = 0; index < INVENTORY.baseSlots; index++) {
            addItemCapped(team, item(`type${index}`));
        }

        expect(canAddItem(team, item('overflow'))).toBe(false);
        expect(addItemCapped(team, item('overflow'))).toBe(false);
    });

    it('an equipped bag raises the capacity for the whole party', () => {
        const team = new Team();
        const farmer = new Character({ id: 'farmer' });
        team.addCharacter(farmer);
        farmer.equipment.equipOrReplace(bag(5), farmer);

        expect(inventoryCapacity(team)).toBe(INVENTORY.baseSlots + 5);
        for (let index = 0; index < INVENTORY.baseSlots + 5; index++) {
            expect(addItemCapped(team, item(`type${index}`))).toBe(true);
        }
        expect(canAddItem(team, item('overflow'))).toBe(false);
    });

    it('unequipping the bag shrinks the capacity again', () => {
        const team = new Team();
        const farmer = new Character({ id: 'farmer' });
        team.addCharacter(farmer);
        farmer.equipment.equipOrReplace(bag(5), farmer);
        expect(inventoryCapacity(team)).toBe(INVENTORY.baseSlots + 5);

        farmer.equipment.unequip('bag', farmer);

        expect(inventoryCapacity(team)).toBe(INVENTORY.baseSlots);
    });

    it('the shop refuses to buy when the inventory is full', () => {
        const team = new Team();
        team.gold = 1000;
        for (let index = 0; index < INVENTORY.baseSlots; index++) {
            buyItem(team, entry(`type${index}`));
        }

        const goldBefore = team.gold;
        expect(buyItem(team, entry('overflow'))).toBe('inventory_full');
        expect(team.gold).toBe(goldBefore);
    });
});
