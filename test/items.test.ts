import { Character, Stats } from '../src';
import { DEFAULT_ITEM_TABLE } from '../worldTest/core/items';
import { Items } from '../worldTest/core/constants/items';
import type { ItemTableEntry } from '../worldTest/core/loot/itemTable';
import { resolveGeneralAttack } from '../worldTest/core/damage/general';
import { reactionsOf } from '../worldTest/core/damage/reactions';

describe('the item dictionary', () => {
    it('registers every constant in the global table from the same source', () => {
        const entries = Object.entries(Items) as Array<[string, ItemTableEntry]>;
        for (const [key, entry] of entries) {
            expect(DEFAULT_ITEM_TABLE.has(entry.id)).toBe(true);
            expect(DEFAULT_ITEM_TABLE.get(entry.id)?.name).toBe(entry.name);
            expect(DEFAULT_ITEM_TABLE.createItem(entry.id).id).toBe(entry.id);
            expect(key).toBe(entry.id); // the dictionary key mirrors the id
        }
    });

    it('resolves a reference into a live item with its effects', () => {
        const stick = DEFAULT_ITEM_TABLE.createItem(Items.stick.id);
        expect(stick.name).toBe('Stick');
        expect(stick.definition.effects).toEqual([
            { stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 1 },
        ]);
    });

    it('the spike shield item wires its reactive skill on equip and removes it on unequip', () => {
        const defender = new Character({
            id: 'tank',
            name: 'Tank',
            stats: new Stats({ hp: 100, totalHp: 100, defence: 20 }),
        });
        const attacker = new Character({
            id: 'raider',
            name: 'Raider',
            stats: new Stats({ attack: 10, hp: 100, totalHp: 100, defence: 0 }),
        });

        expect(reactionsOf(defender)).toHaveLength(0);
        defender.equipment.equipOrReplace(DEFAULT_ITEM_TABLE.createItem('spike_shield'), defender);

        // Equipping attached the reactive skill (defence 20 + 4 = 24):
        // the next hit is answered with 10 + 20% of 24 = 14.8 physical.
        expect(reactionsOf(defender)).toHaveLength(1);
        const outcome = resolveGeneralAttack(attacker, defender, () => 1);
        expect(outcome.counter?.components[0].amount).toBe(14.8);

        // Unequipping removes the piece again.
        defender.equipment.unequip('armor', defender);
        expect(reactionsOf(defender)).toHaveLength(0);
        expect(resolveGeneralAttack(attacker, defender, () => 1).counter).toBeUndefined();
    });
});
