import { Item } from '../src';
import { itemDescriptionText, itemStatsSummary, itemStatsText } from '../worldTest/core/view/itemStats';

describe('item stats summary', () => {
    it('lists elemental bonus damage with its kind', () => {
        const fireSword = new Item({
            id: 'fire_sword',
            name: 'Fire Sword',
            category: 'weapon',
            slot: 'weapon',
            elements: [{ element: 'fire', attackValue: 12 }],
        });

        expect(itemStatsSummary(fireSword)).toEqual([
            { icon: '🔥', text: '+12 fire attack (magical)' },
        ]);
    });

    it('lists stat effects and resistances', () => {
        const shield = new Item({
            id: 'shield',
            name: 'Shield',
            category: 'armor',
            slot: 'armor',
            effects: [{ stat: 'defence', typeOfModification: 'BUFF_FIXED', value: 5 }],
            elements: [{ element: 'fire', resistanceValue: 4 }],
        });

        expect(itemStatsSummary(shield)).toEqual([
            { icon: '🛡️', text: '+5 defence' },
            { icon: '🔥', text: 'resist 4 fire' },
        ]);
    });

    it('lists physical and magical components separately', () => {
        const guinsoo = new Item({
            id: 'guinsoo',
            name: 'Guinsoo Rageblade',
            category: 'weapon',
            slot: 'weapon',
            elements: [
                { element: 'physical', attackValue: 6 },
                { element: 'arcane', attackValue: 6 },
            ],
        });

        expect(itemStatsSummary(guinsoo)).toEqual([
            { icon: '⚔️', text: '+6 physical attack' },
            { icon: '✨', text: '+6 arcane attack (magical)' },
        ]);
    });

    it('lists the enhanced stats with their icons', () => {
        const dagger = new Item({
            id: 'dagger',
            name: 'Dagger',
            category: 'weapon',
            slot: 'weapon',
            effects: [{ stat: 'critChance', typeOfModification: 'BUFF_FIXED', value: 10 }],
        });
        const ring = new Item({
            id: 'ring',
            name: 'Ring',
            category: 'armor',
            slot: 'accessory',
            effects: [{ stat: 'magicDefence', typeOfModification: 'BUFF_FIXED', value: 6 }],
            elements: [{ element: 'fire', resistanceValue: 4 }],
        });

        expect(itemStatsSummary(dagger)).toEqual([
            { icon: '🎯', text: '+10 critChance' },
        ]);
        expect(itemStatsSummary(ring)).toEqual([
            { icon: '🔮', text: '+6 magicDefence' },
            { icon: '🔥', text: 'resist 4 fire' },
        ]);
    });

    it('combines the written description with the generated stats', () => {
        const sword = new Item({
            id: 'botrk',
            name: 'Ruined King Sword',
            category: 'weapon',
            slot: 'weapon',
            description: 'Adds physical damage equal to 12% of the target\'s maximum HP.',
        });

        expect(itemDescriptionText(sword)).toContain('12% of the target\'s maximum HP');
    });

    it('handles percentage buffs, debuffs and resistances', () => {
        const ring = new Item({
            id: 'cursed_ring',
            name: 'Cursed Ring',
            category: 'armor',
            slot: 'accessory',
            effects: [
                { stat: 'attack', typeOfModification: 'BUFF_PERCENTAGE', value: 20 },
                { stat: 'hp', typeOfModification: 'DEBUFF_PERCENTAGE', value: 30 },
            ],
            elements: [{ element: 'lightning', resistanceValue: 5 }],
        });

        const text = itemStatsText(ring);
        expect(text).toContain('+20% attack');
        expect(text).toContain('-30% hp');
        expect(text).toContain('resist 5 lightning');
    });

    it('returns no lines for an item without effects', () => {
        expect(itemStatsSummary(new Item({ id: 'plain', name: 'Plain', category: 'weapon' }))).toEqual([]);
    });
});
