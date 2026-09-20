import { Character, Item, Stats } from '../src';
import type { Statistics } from '../src';
import { kindOfElement } from '../worldTest/core/config/damage';
import type { DamageComponent } from '../worldTest/core/damage/composer';
import type { ElementId } from '../worldTest/core/damage/elements';
import { resolveGeneralAttack } from '../worldTest/core/damage/general';

const noCrit = () => 1;

function character(id: string, stats: Partial<Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

// Fixture weapons with the same hooks the real catalog used, so the
// onAttack mechanism stays covered without world content.

const hitCounters = new WeakMap<Item, number>();

function guinsoo(): Item {
    return new Item({
        id: 'guinsoo_rageblade',
        name: 'Guinsoo Rageblade',
        category: 'weapon',
        slot: 'weapon',
        description: '+6 physical and +6 magical damage. Every 4th attack applies these bonuses twice.',
        elements: [
            { element: 'physical', attackValue: 6 },
            { element: 'arcane', attackValue: 6 },
        ],
        onEquip: (item) => hitCounters.set(item, 0),
        onAttack: ({ item, components }) => {
            const hits = (hitCounters.get(item) ?? 0) + 1;
            hitCounters.set(item, hits);
            if (hits % 4 !== 0) return components;

            const bonus: DamageComponent[] = [];
            for (const element of item.definition.elements ?? []) {
                if (!element.attackValue) continue;
                bonus.push({
                    kind: kindOfElement(element.element),
                    element: element.element as ElementId,
                    amount: element.attackValue,
                    label: item.name,
                });
            }
            return [...components, ...bonus];
        },
    });
}

function ruinedKingSword(): Item {
    return new Item({
        id: 'ruined_king_sword',
        name: 'Ruined King Sword',
        category: 'weapon',
        slot: 'weapon',
        description: 'Adds physical damage equal to 12% of the target\'s maximum HP.',
        onAttack: ({ defender, components }) => {
            const bonus = Math.round(defender.getStat('totalHp') * 12) / 100;
            return [...components, { kind: 'physical', element: 'physical', amount: bonus, label: 'Ruined King Sword' }];
        },
    });
}

function titanicHydra(): Item {
    return new Item({
        id: 'titanic_hydra',
        name: 'Titanic Hydra',
        category: 'weapon',
        slot: 'weapon',
        description: 'Adds physical damage equal to 12% of your maximum HP.',
        onAttack: ({ attacker, components }) => {
            const bonus = Math.round(attacker.getStat('totalHp') * 12) / 100;
            return [...components, { kind: 'physical', element: 'physical', amount: bonus, label: 'Titanic Hydra' }];
        },
    });
}

describe('weapon onAttack hooks', () => {
    it('guinsoo adds +6 physical and +6 magical on every hit', () => {
        const attacker = character('dummy', { attack: 4, hp: 400, totalHp: 400 });
        attacker.equipment.equipOrReplace(guinsoo(), attacker);
        const defender = character('hero', { hp: 100, totalHp: 100, defence: 0, magicDefence: 0 });

        const outcome = resolveGeneralAttack(attacker, defender, noCrit, { breakdown: true });

        expect(outcome.damage).toBe(16); // (4 + 6) physical + 6 magical
        expect(outcome.breakdown).toHaveLength(2);
        expect(outcome.breakdown?.[0]).toMatchObject({ element: 'physical', damage: 10, final: 10 });
        expect(outcome.breakdown?.[1]).toMatchObject({ element: 'arcane', damage: 6, final: 6 });
    });

    it('guinsoo doubles its own bonuses on the 4th hit, leaving the base attack alone', () => {
        const attacker = character('dummy', { attack: 4, hp: 400, totalHp: 400 });
        attacker.equipment.equipOrReplace(guinsoo(), attacker);
        const defender = character('hero', { hp: 1000, totalHp: 1000, defence: 0, magicDefence: 0 });

        const hits: number[] = [];
        for (let hit = 1; hit <= 5; hit++) {
            hits.push(resolveGeneralAttack(attacker, defender, noCrit).damage);
        }

        expect(hits).toEqual([16, 16, 16, 28, 16]); // 4th = 16 physical + 12 magical
    });

    it('guinsoo counts hits per item instance', () => {
        const defender = character('hero', { hp: 1000, totalHp: 1000, defence: 0, magicDefence: 0 });

        const first = character('dummy', { attack: 4, hp: 400, totalHp: 400 });
        first.equipment.equipOrReplace(guinsoo(), first);
        resolveGeneralAttack(first, defender, noCrit);
        resolveGeneralAttack(first, defender, noCrit);
        resolveGeneralAttack(first, defender, noCrit);

        // A second guinsoo starts its own counter at zero.
        const second = character('dummy2', { attack: 4, hp: 400, totalHp: 400 });
        second.equipment.equipOrReplace(guinsoo(), second);
        expect(resolveGeneralAttack(second, defender, noCrit).damage).toBe(16);

        // The first one still triggers on its own 4th hit.
        expect(resolveGeneralAttack(first, defender, noCrit).damage).toBe(28);
    });

    it('ruined king sword adds 12% of the target maximum hp as physical damage', () => {
        const attacker = character('dummy', { attack: 0, hp: 100, totalHp: 100 });
        attacker.equipment.equipOrReplace(ruinedKingSword(), attacker);

        const full = character('hero', { hp: 100, totalHp: 100, defence: 5 });
        expect(resolveGeneralAttack(attacker, full, noCrit).damage).toBe(10.91); // 12 * 50/55

        // Wounded target (50 current out of 100 max): the bonus still
        // uses the maximum, not the current HP.
        const wounded = character('hero2', { hp: 50, totalHp: 100, defence: 5 });
        expect(resolveGeneralAttack(attacker, wounded, noCrit).damage).toBe(10.91); // 12 * 50/55
    });

    it('titanic hydra adds 12% of the bearer maximum hp as physical damage', () => {
        // Wounded bearer (10 current HP out of 200 max): the bonus must
        // still use the maximum, not the current HP.
        const attacker = character('dummy', { attack: 0, hp: 10, totalHp: 200 });
        attacker.equipment.equipOrReplace(titanicHydra(), attacker);

        const defender = character('hero', { hp: 100, totalHp: 100, defence: 0 });
        expect(resolveGeneralAttack(attacker, defender, noCrit).damage).toBe(24);
    });

    it('unequipping a weapon removes its hook', () => {
        const attacker = character('dummy', { attack: 0, hp: 100, totalHp: 100 });
        attacker.equipment.equipOrReplace(titanicHydra(), attacker);
        const defender = character('hero', { hp: 100, totalHp: 100, defence: 0 });

        attacker.equipment.unequip('weapon', attacker);

        expect(resolveGeneralAttack(attacker, defender, noCrit).damage).toBe(0);
    });
});
