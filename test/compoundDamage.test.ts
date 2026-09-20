import { Character, Stats } from '../src';
import { Item } from '../src/classes/items/Item';
import { DEFAULT_ELEMENTS, ElementRegistry } from '../worldTest/core/damage/elements';
import { DamageComposer } from '../worldTest/core/damage/composer';
import type { DamageComponent, DefenceLayer } from '../worldTest/core/damage/composer';
import { attackComponentsOf, defenceLayersOf, resolveBasicAttack } from '../worldTest/core/damage/character';

describe('element registry', () => {
    it('registers and retrieves elements', () => {
        expect(DEFAULT_ELEMENTS.get('fire')?.name).toBe('Fire');
        expect(DEFAULT_ELEMENTS.get('poison')?.icon).toBe('☠️');
        expect(DEFAULT_ELEMENTS.has('void')).toBe(false);
    });

    it('rejects duplicate registrations', () => {
        const registry = new ElementRegistry();
        registry.register({ id: 'fire', name: 'Fire', icon: '🔥' });

        expect(() => registry.register({ id: 'fire', name: 'Fire 2', icon: '🔥' })).toThrow();
    });
});

describe('damage composer', () => {
    it('sums multiple components into a single final value', () => {
        const result = DamageComposer.resolve(
            [
                { element: 'physical', amount: 10, label: 'Attack' },
                { element: 'fire', amount: 8, label: 'Fire Staff' },
            ],
            [],
        );
        expect(result.total).toBe(18);
    });

    it('reduces each element only with its matching defence layer', () => {
        const result = DamageComposer.resolve(
            [
                { element: 'physical', amount: 10, label: 'Attack' },
                { element: 'fire', amount: 8, label: 'Fire Staff' },
            ],
            [
                { element: 'physical', reduction: 5, label: 'Defence' },
                { element: 'fire', reduction: 4, label: 'Ward Shield' },
            ],
        );
        expect(result.total).toBe(9); // (10 - 5) + (8 - 4)
    });

    it('never reduces a component below zero', () => {
        const result = DamageComposer.resolve(
            [{ element: 'fire', amount: 4, label: 'Fireball' }],
            [{ element: 'fire', reduction: 10, label: 'Ward' }],
        );
        expect(result.total).toBe(0);
    });

    it('returns the breakdown only when the flag is on', () => {
        const components: DamageComponent[] = [{ element: 'fire', amount: 40, label: 'Fireball' }];
        const layers: DefenceLayer[] = [{ element: 'fire', reduction: 4, label: 'Ward' }];

        const without = DamageComposer.resolve(components, layers, { breakdown: false });
        expect(without.breakdown).toEqual([]);

        const withFlag = DamageComposer.resolve(components, layers, { breakdown: true });
        expect(withFlag.breakdown).toEqual([
            { element: 'fire', label: 'Fireball', damage: 40, multiplier: 1, reducedBy: 4, final: 36 },
        ]);
    });
});

describe('character compound damage', () => {
    it('includes equipped item elements in the attack components', () => {
        const attacker = new Character({ id: 'attacker', stats: new Stats({ attack: 10 }) });
        attacker.equipment.equipOrReplace(new Item({
            id: 'fire_staff',
            name: 'Fire Staff',
            category: 'magic_weapon',
            slot: 'weapon',
            elements: [{ element: 'fire', attackValue: 8 }],
        }), attacker);

        const components = attackComponentsOf(attacker);
        expect(components).toHaveLength(2);
        expect(components[1]).toEqual({ kind: 'magical', element: 'fire', amount: 8, label: 'Fire Staff' });
    });

    it('merges item resistances into the defence layers', () => {
        const defender = new Character({ id: 'defender', stats: new Stats({ defence: 5 }) });
        defender.equipment.equipOrReplace(new Item({
            id: 'ward_shield',
            name: 'Ward Shield',
            category: 'armor',
            slot: 'armor',
            elements: [{ element: 'fire', resistanceValue: 4 }],
        }), defender);

        const layers = defenceLayersOf(defender);
        expect(layers).toContainEqual({ element: 'fire', reduction: 4, label: 'Fire' });
    });

    it('resolves a basic attack as a compound and applies the single final value', () => {
        const attacker = new Character({ id: 'attacker', stats: new Stats({ attack: 10, hp: 100, totalHp: 100 }) });
        attacker.equipment.equipOrReplace(new Item({
            id: 'fire_staff',
            name: 'Fire Staff',
            category: 'magic_weapon',
            slot: 'weapon',
            elements: [{ element: 'fire', attackValue: 8 }],
        }), attacker);

        const defender = new Character({ id: 'defender', stats: new Stats({ defence: 5, hp: 100, totalHp: 100 }) });
        defender.equipment.equipOrReplace(new Item({
            id: 'ward_shield',
            name: 'Ward Shield',
            category: 'armor',
            slot: 'armor',
            elements: [{ element: 'fire', resistanceValue: 4 }],
        }), defender);

        const result = resolveBasicAttack(attacker, defender, { breakdown: true });

        // physical: 10 * 50/(50+5); fire: 8 (no magicDefence) - 4 resistance
        expect(result.total).toBe(13.09);
        expect(result.breakdown).toHaveLength(2);
        expect(defender.stats.hp).toBe(86.91);
        expect(defender.stats.isAlive).toBe(1);
    });
});
