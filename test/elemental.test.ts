import { Character, Stats } from '../src';
import { Item } from '../src/classes/items/Item';
import { DamageComposer } from '../worldTest/core/damage/composer';
import { attackComponentsOf, resolveBasicAttack } from '../worldTest/core/damage/character';
import { setAffinity } from '../worldTest/core/damage/affinities';

describe('elemental multipliers', () => {
    it('halves fire damage against a 2x-resistant defender (0.5)', () => {
        const result = DamageComposer.resolve(
            [{ element: 'fire', amount: 10, label: 'Fire' }],
            [{ element: 'fire', reduction: 0, multiplier: 0.5, label: '×0.5 Fire' }],
        );
        expect(result.total).toBe(5);
    });

    it('doubles fire damage against a 2x-weak defender', () => {
        const result = DamageComposer.resolve(
            [{ element: 'fire', amount: 10, label: 'Fire' }],
            [{ element: 'fire', reduction: 0, multiplier: 2, label: '×2 Fire' }],
        );
        expect(result.total).toBe(20);
    });

    it('applies the multiplier before the flat reduction', () => {
        const result = DamageComposer.resolve(
            [{ element: 'fire', amount: 10, label: 'Fire' }],
            [
                { element: 'fire', reduction: 2, label: 'Ward' },
                { element: 'fire', reduction: 0, multiplier: 2, label: '×2 Fire' },
            ],
        );
        expect(result.total).toBe(18); // 10 * 2 - 2
    });

    it('converts the whole attack into fire with the converting sword', () => {
        const ember = new Character({ id: 'ember', stats: new Stats({ attack: 9 }) });
        ember.equipment.equipOrReplace(new Item({
            id: 'fire_sword',
            name: 'Fire Sword',
            category: 'weapon',
            slot: 'weapon',
            elements: [{ element: 'fire', attackValue: 12, convertsAttack: true }],
        }), ember);

        expect(attackComponentsOf(ember)).toEqual([
            { element: 'fire', amount: 21, label: 'Fire Sword' },
        ]);
    });

    it('uses character affinities in basic attacks (fire sword vs golem and wraith)', () => {
        const ember = new Character({ id: 'ember', stats: new Stats({ attack: 9, hp: 100, totalHp: 100 }) });
        ember.equipment.equipOrReplace(new Item({
            id: 'fire_sword',
            name: 'Fire Sword',
            category: 'weapon',
            slot: 'weapon',
            elements: [{ element: 'fire', attackValue: 12, convertsAttack: true }],
        }), ember);

        const golem = new Character({ id: 'fire_golem', stats: new Stats({ hp: 100, totalHp: 100, defence: 0 }) });
        setAffinity('fire_golem', 'fire', 0.5);

        const wraith = new Character({ id: 'ice_wraith', stats: new Stats({ hp: 100, totalHp: 100, defence: 0 }) });
        setAffinity('ice_wraith', 'fire', 2);

        const vsGolem = resolveBasicAttack(ember, golem);
        expect(vsGolem.total).toBe(10.5); // (9 + 12) * 0.5

        const vsWraith = resolveBasicAttack(ember, wraith);
        expect(vsWraith.total).toBe(42); // (9 + 12) * 2
    });
});
