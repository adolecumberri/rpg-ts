import { Character, Stats } from '../src';
import { Item } from '../src/classes/items/Item';
import { characterElementsSummary } from '../worldTest/core/view/elementSummary';
import { setAffinity } from '../worldTest/core/damage/affinities';

describe('character elements summary', () => {
    it('is empty for a character without elemental gear', () => {
        const hero = new Character({ id: 'hero', stats: new Stats({ attack: 10, defence: 5 }) });

        expect(characterElementsSummary(hero)).toEqual({ attack: [], defence: [] });
    });

    it('reports a converted attack (fire sword)', () => {
        const ember = new Character({ id: 'ember', stats: new Stats({ attack: 9 }) });
        ember.equipment.equipOrReplace(new Item({
            id: 'fire_sword',
            name: 'Fire Sword',
            category: 'weapon',
            slot: 'weapon',
            elements: [{ element: 'fire', attackValue: 12, convertsAttack: true }],
        }), ember);

        const summary = characterElementsSummary(ember);
        expect(summary.attack).toEqual([{ element: 'fire', amount: 21, converted: true }]);
        expect(summary.defence).toEqual([]);
    });

    it('reports bonus elemental attack and resistances separately', () => {
        const hero = new Character({ id: 'hero', stats: new Stats({ attack: 10, defence: 5 }) });
        hero.equipment.equipOrReplace(new Item({
            id: 'fire_staff',
            name: 'Fire Staff',
            category: 'magic_weapon',
            slot: 'weapon',
            elements: [{ element: 'fire', attackValue: 8 }],
        }), hero);
        hero.equipment.equipOrReplace(new Item({
            id: 'ward_shield',
            name: 'Ward Shield',
            category: 'armor',
            slot: 'armor',
            elements: [{ element: 'fire', resistanceValue: 4 }],
        }), hero);

        const summary = characterElementsSummary(hero);
        expect(summary.attack).toEqual([{ element: 'fire', amount: 8, converted: false }]);
        expect(summary.defence).toEqual([{ element: 'fire', reduction: 4, multiplier: 1 }]);
    });

    it('reports affinities as multipliers', () => {
        const golem = new Character({ id: 'fire_golem', stats: new Stats({ defence: 0 }) });
        setAffinity('fire_golem', 'fire', 0.5);

        const summary = characterElementsSummary(golem);
        expect(summary.defence).toEqual([{ element: 'fire', reduction: 0, multiplier: 0.5 }]);
    });
});
