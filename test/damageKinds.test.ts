import { Character, Stats } from '../src';
import type { Statistics } from '../src';
import { Item } from '../src/classes/items/Item';
import { attackComponentsOf } from '../worldTest/core/damage/character';
import { generalAttackResolver, resolveGeneralAttack } from '../worldTest/core/damage/general';
import { resolveIntervalStressDemo } from '../worldTest/core/config/intervalStressTest';

const noCrit = () => 1; // roll = 100: never below any chance
const alwaysCrit = () => 0; // roll = 0: always below any chance above 0

function character(id: string, stats: Partial<Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

describe('damage kinds', () => {
    it('reduces physical damage with the defence formula', () => {
        const attacker = character('a', { attack: 10 });
        const defender = character('d', { defence: 5, magicDefence: 99 });

        expect(resolveGeneralAttack(attacker, defender, noCrit).damage).toBe(9.09); // 10 * 50/55
    });

    it('reduces magical damage with the magicDefence formula and ignores defence', () => {
        const attacker = character('a', { attack: 0 });
        attacker.equipment.equipOrReplace(new Item({
            id: 'fire_staff',
            name: 'Fire Staff',
            category: 'magic_weapon',
            slot: 'weapon',
            elements: [{ element: 'fire', attackValue: 12 }],
        }), attacker);

        const defender = character('d', { defence: 99, magicDefence: 3 });

        expect(resolveGeneralAttack(attacker, defender, noCrit).damage).toBe(11.32); // 12 * 50/53
    });

    it('true damage deals its amount with no mitigation at all', () => {
        const attacker = character('a', { attack: 0 });
        attacker.equipment.equipOrReplace(new Item({
            id: 'thorns',
            name: 'Thorns',
            category: 'weapon',
            slot: 'weapon',
            elements: [{ element: 'true', attackValue: 10 }],
        }), attacker);

        const defender = character('d', { defence: 99, magicDefence: 99 });
        defender.equipment.equipOrReplace(new Item({
            id: 'aegis',
            name: 'Aegis',
            category: 'armor',
            slot: 'armor',
            elements: [{ element: 'true', resistanceValue: 5 }],
        }), defender);

        expect(resolveGeneralAttack(attacker, defender, noCrit).damage).toBe(10);
    });

    it('crits double physical damage before reduction and report it', () => {
        const attacker = character('a', { attack: 10, critChance: 10, critMultiplier: 2 });
        const defender = character('d', { defence: 4 });

        const outcome = resolveGeneralAttack(attacker, defender, alwaysCrit);

        expect(outcome.damage).toBe(18.52); // 10 * 2 * 50/(50+4)
        expect(outcome.note).toBe('crit ×2');
    });

    it('magical components never crit', () => {
        const attacker = character('a', { attack: 0, critChance: 100, critMultiplier: 2 });
        attacker.equipment.equipOrReplace(new Item({
            id: 'fire_staff',
            name: 'Fire Staff',
            category: 'magic_weapon',
            slot: 'weapon',
            elements: [{ element: 'fire', attackValue: 12 }],
        }), attacker);

        const defender = character('d', { magicDefence: 0 });

        const outcome = resolveGeneralAttack(attacker, defender, alwaysCrit);

        expect(outcome.damage).toBe(12);
        expect(outcome.note).toBeUndefined();
    });

    it('rolls crits per component: only the physical part of a fire sword crits', () => {
        const attacker = character('a', { attack: 9, critChance: 100, critMultiplier: 2 });
        attacker.equipment.equipOrReplace(new Item({
            id: 'fire_sword',
            name: 'Fire Sword',
            category: 'weapon',
            slot: 'weapon',
            elements: [{ element: 'fire', attackValue: 12 }],
        }), attacker);

        const defender = character('d', { defence: 0, magicDefence: 0 });

        const outcome = resolveGeneralAttack(attacker, defender, alwaysCrit, { breakdown: true });

        expect(outcome.damage).toBe(30); // 9 * 2 + 12
        expect(outcome.breakdown?.[0].crit).toBe(true);
        expect(outcome.breakdown?.[1].crit).toBeUndefined();
    });

    it('respects the critChance stat: 0 never crits, 100 always crits', () => {
        const defender = character('d', { defence: 0 });
        const unlucky = character('a', { attack: 10, critChance: 0, critMultiplier: 2 });
        const lucky = character('b', { attack: 10, critChance: 100, critMultiplier: 2 });

        expect(resolveGeneralAttack(unlucky, defender, alwaysCrit).damage).toBe(10);
        expect(resolveGeneralAttack(lucky, defender, alwaysCrit).damage).toBe(20);
    });

    it('the engine resolver returns damage and note without mutating the defender', () => {
        const attacker = character('a', { attack: 10, critChance: 100, critMultiplier: 2 });
        const defender = character('d', { hp: 50, totalHp: 50, defence: 0 });

        const resolved = generalAttackResolver(attacker, defender, alwaysCrit);

        expect(resolved.damage).toBe(20);
        expect(resolved.note).toBe('crit ×2');
        expect(defender.stats.hp).toBe(50); // untouched by the resolver
    });

    it('equipping and unequipping items updates components and magicDefence', () => {
        const attacker = character('a', { attack: 10 });
        const defender = character('d', { magicDefence: 0 });
        const fire = new Item({
            id: 'fire_sword',
            name: 'Fire Sword',
            category: 'weapon',
            slot: 'weapon',
            elements: [{ element: 'fire', attackValue: 12 }],
        });
        const ward = new Item({
            id: 'ward_ring',
            name: 'Ward Ring',
            category: 'armor',
            slot: 'accessory',
            effects: [{ stat: 'magicDefence', typeOfModification: 'BUFF_FIXED', value: 6 }],
        });

        attacker.equipment.equipOrReplace(fire, attacker);
        expect(attackComponentsOf(attacker)).toHaveLength(2);

        attacker.equipment.unequip('weapon', attacker);
        expect(attackComponentsOf(attacker)).toHaveLength(1);

        defender.equipment.equipOrReplace(ward, defender);
        expect(defender.getStat('magicDefence')).toBe(6);
        expect(resolveGeneralAttack(attacker, defender, noCrit).damage).toBe(10);

        defender.equipment.unequip('accessory', defender);
        expect(defender.getStat('magicDefence')).toBe(0);
    });

    it('the interval stress demo reports crits when randomness allows them', () => {
        const result = resolveIntervalStressDemo('small', { random: alwaysCrit, randomTarget: false });

        const critTurns = result.turns.filter((turn) => turn.note === 'crit ×2');
        expect(critTurns.length).toBeGreaterThan(0);
        expect(result.turns.every((turn) => turn.note === 'crit ×2')).toBe(true);
    });
});
