import { Character, IntervalCombat, Stats, Team, TeamPosition } from '../src';
import type { IntervalCombatant } from '../src';
import { HybridCombat } from '../worldTest/core/combat/hybridCombat';
import { tauntOf, pickWeightedTarget } from '../worldTest/core/combat/targeting';

function character(
    id: string,
    stats: Partial<import('../src').Statistics>,
    position?: TeamPosition,
): Character {
    return new Character({ id, name: id, stats: new Stats(stats), position });
}

function combatant(
    id: string,
    stats: Partial<import('../src').Statistics>,
    interval = 100,
    position?: TeamPosition,
): IntervalCombatant {
    return {
        character: character(id, { hp: 1000, totalHp: 1000, attack: 0, ...stats }, position),
        interval,
    };
}

describe('the taunt statistic', () => {
    it('defaults to 1 for every character', () => {
        expect(character('a', { hp: 10, totalHp: 10 }).getStat('taunt')).toBe(1);
    });

    it('accepts custom values', () => {
        expect(character('a', { hp: 10, totalHp: 10, taunt: 5 }).getStat('taunt')).toBe(5);
    });

    it('falls back to a base of 1 when the value is missing or non-positive', () => {
        // The back row multiplies by 1, so tauntOf shows the raw fallback.
        expect(tauntOf(character('a', { hp: 10, totalHp: 10 }, 'back'))).toBe(1);
        expect(tauntOf(character('a', { hp: 10, totalHp: 10, taunt: 0 }, 'back'))).toBe(1);
        expect(tauntOf(character('a', { hp: 10, totalHp: 10, taunt: -3 }, 'back'))).toBe(1);
    });
});

describe('the team position', () => {
    it('defaults to front for every character', () => {
        expect(character('a', { hp: 10, totalHp: 10 }).position).toBe('front');
    });

    it('multiplies the targeting weight: front ×3, center ×2, back ×1', () => {
        expect(tauntOf(character('a', { hp: 10, totalHp: 10, taunt: 5 }, 'front'))).toBe(15);
        expect(tauntOf(character('a', { hp: 10, totalHp: 10, taunt: 5 }, 'center'))).toBe(10);
        expect(tauntOf(character('a', { hp: 10, totalHp: 10, taunt: 5 }, 'back'))).toBe(5);
    });

    it('multiplies the fallback base too (a front-liner never goes below ×3)', () => {
        expect(tauntOf(character('a', { hp: 10, totalHp: 10 }))).toBe(3);
        expect(tauntOf(character('a', { hp: 10, totalHp: 10, taunt: 0 }, 'center'))).toBe(2);
    });

    it('the team exposes formation row helpers', () => {
        const team = new Team();
        const hero = character('hero', { hp: 10, totalHp: 10 });
        team.addCharacter(hero);

        expect(team.getPosition('hero')).toBe('front');
        team.setPosition('hero', 'back');
        expect(hero.position).toBe('back');
        expect(team.getPosition('hero')).toBe('back');
        expect(team.getPosition('missing')).toBeUndefined();
        expect(() => team.setPosition('missing', 'center')).toThrow();
    });
});

describe('pickWeightedTarget', () => {
    it('returns undefined for an empty pool and the only member of a single pool', () => {
        expect(pickWeightedTarget([], () => 0.5)).toBeUndefined();
        const only = character('only', { hp: 10, totalHp: 10 });
        expect(pickWeightedTarget([only], () => 0.5)).toBe(only);
    });
});

describe('weighted targeting in the interval engine', () => {
    it('picks the 6-taunt defender with 6/10 and each 1-taunt one with 1/10', () => {
        const hero = combatant('hero', { attack: 1 }, 1);
        const tank = combatant('tank', { taunt: 6 });
        const a = combatant('a', { taunt: 1 });
        const b = combatant('b', { taunt: 1 });
        const c = combatant('c', { taunt: 1 });
        const d = combatant('d', { taunt: 1 });

        // Rolls spread evenly over [0.05, 0.95): ×10 (6+1+1+1+1) they
        // land on 0.5..9.5, so 6 land inside the 6-taunt slice and one
        // lands inside each 1-taunt slice.
        const values = [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95];
        let cursor = 0;
        const result = new IntervalCombat({
            maxTicks: 10,
            randomTarget: true,
            random: () => values[cursor++ % values.length],
        }).resolve([hero], [tank, a, b, c, d]);

        const hitsByTarget = new Map<string, number>();
        for (const turn of result.turns) {
            hitsByTarget.set(turn.targetId, (hitsByTarget.get(turn.targetId) ?? 0) + 1);
        }
        expect(hitsByTarget.get('tank')).toBe(6);
        expect(hitsByTarget.get('a')).toBe(1);
        expect(hitsByTarget.get('b')).toBe(1);
        expect(hitsByTarget.get('c')).toBe(1);
        expect(hitsByTarget.get('d')).toBe(1);
    });

    it('a taunt-3 defender eats every hit while the taunt-1 one is ignored (and vice versa)', () => {
        const hero = combatant('hero', { attack: 1 }, 1);
        const tank = combatant('tank', { taunt: 3 });
        const weak = combatant('weak', { taunt: 1 });

        const lowRolls = new IntervalCombat({ maxTicks: 10, randomTarget: true, random: () => 0.1 })
            .resolve([hero], [tank, weak]);
        expect(lowRolls.turns.every((turn) => turn.targetId === 'tank')).toBe(true);
        expect(weak.character.stats.hp).toBe(1000);

        // Fresh characters: high rolls must leave the taunt-3 one alone.
        const hero2 = combatant('hero2', { attack: 1 }, 1);
        const tank2 = combatant('tank2', { taunt: 3 });
        const weak2 = combatant('weak2', { taunt: 1 });
        const highRolls = new IntervalCombat({ maxTicks: 10, randomTarget: true, random: () => 0.9 })
            .resolve([hero2], [tank2, weak2]);
        expect(highRolls.turns.every((turn) => turn.targetId === 'weak2')).toBe(true);
        expect(tank2.character.stats.hp).toBe(1000);
    });

    it('with every taunt at 1 the pick is the classic uniform one', () => {
        const hero = combatant('hero', { attack: 1 }, 1);
        const first = combatant('first', { taunt: 1 });
        const second = combatant('second', { taunt: 1 });
        const third = combatant('third', { taunt: 1 });

        const result = new IntervalCombat({ maxTicks: 1, randomTarget: true, random: () => 0.3 })
            .resolve([hero], [first, second, third]);

        expect(result.turns[0].targetId).toBe('first'); // floor(0.3 * 3) === 0
    });

    it('a front-liner eats 3/4 of the hits against an equal-taunt back-liner', () => {
        const hero = combatant('hero', { attack: 1 }, 1);
        const front = combatant('front', { taunt: 1 }, 100, 'front');
        const back = combatant('back', { taunt: 1 }, 100, 'back');

        // Total weight 3+1: rolls ×4 land on 0.6, 1.2, 1.8 (front's
        // 3-slice) and 3.2, 3.8 (back's 1-slice).
        const values = [0.15, 0.3, 0.45, 0.8, 0.95];
        let cursor = 0;
        const result = new IntervalCombat({
            maxTicks: 5,
            randomTarget: true,
            random: () => values[cursor++ % values.length],
        }).resolve([hero], [front, back]);

        const hitsByTarget = new Map<string, number>();
        for (const turn of result.turns) {
            hitsByTarget.set(turn.targetId, (hitsByTarget.get(turn.targetId) ?? 0) + 1);
        }
        expect(hitsByTarget.get('front')).toBe(3);
        expect(hitsByTarget.get('back')).toBe(2);
    });

    it('a center-liner eats 2/3 of the hits against an equal-taunt back-liner', () => {
        const hero = combatant('hero', { attack: 1 }, 1);
        const center = combatant('center', { taunt: 1 }, 100, 'center');
        const back = combatant('back', { taunt: 1 }, 100, 'back');

        // Total weight 2+1: rolls ×3 land on 0.6, 1.2 (center's
        // 2-slice) and 2.7 (back's 1-slice).
        const values = [0.2, 0.4, 0.9];
        let cursor = 0;
        const result = new IntervalCombat({
            maxTicks: 3,
            randomTarget: true,
            random: () => values[cursor++ % values.length],
        }).resolve([hero], [center, back]);

        const hitsByTarget = new Map<string, number>();
        for (const turn of result.turns) {
            hitsByTarget.set(turn.targetId, (hitsByTarget.get(turn.targetId) ?? 0) + 1);
        }
        expect(hitsByTarget.get('center')).toBe(2);
        expect(hitsByTarget.get('back')).toBe(1);
    });

    it('recomputes the denominator over the alive team only', () => {
        const hero = combatant('hero', { attack: 100 }, 1); // one-shots
        const tank = combatant('tank', { taunt: 3, hp: 1000, totalHp: 1000 });
        const weak = combatant('weak', { taunt: 1, hp: 10, totalHp: 10 });

        // First roll kills the weak one; the engine then only has the
        // tank left, so it must keep hitting the tank (never a dead one).
        const result = new IntervalCombat({ maxTicks: 5, randomTarget: true, random: () => 0.9 })
            .resolve([hero], [tank, weak]);

        expect(result.rightSurvivors).toEqual(['tank']);
        expect(result.turns[0].targetId).toBe('weak'); // roll 3.6 -> weak
        expect(result.turns.every((turn, index) => index === 0 || turn.targetId === 'tank')).toBe(true);
    });
});

describe('weighted targeting in the hybrid engine', () => {
    it('auto fighters pick targets weighted by taunt', () => {
        const farmer = character('farmer', { hp: 20, totalHp: 20, attack: 5, defence: 0, speed: 6 });
        const tank = character('tank', { hp: 100, totalHp: 100, attack: 0, defence: 0, taunt: 3 });
        const weak = character('weak', { hp: 100, totalHp: 100, attack: 0, defence: 0, taunt: 1 });

        const highRoll = new HybridCombat([
            { character: farmer, interval: 2, side: 'left' },
            { character: tank, interval: 100, side: 'right' },
            { character: weak, interval: 100, side: 'right' },
        ], { random: () => 0.9 });
        const highEvent = highRoll.next();
        if (highEvent.kind !== 'auto') throw new Error('expected an auto attack');
        expect(highEvent.targetId).toBe('weak'); // roll 0.9*4 = 3.6

        const lowRoll = new HybridCombat([
            { character: farmer, interval: 2, side: 'left' },
            { character: tank, interval: 100, side: 'right' },
            { character: weak, interval: 100, side: 'right' },
        ], { random: () => 0.1 });
        const lowEvent = lowRoll.next();
        if (lowEvent.kind !== 'auto') throw new Error('expected an auto attack');
        expect(lowEvent.targetId).toBe('tank'); // roll 0.1*4 = 0.4
    });

    it('auto fighters weight the pick by the defender position too', () => {
        const farmer = character('farmer', { hp: 20, totalHp: 20, attack: 5, defence: 0, speed: 6 });
        const front = character('front', { hp: 100, totalHp: 100, attack: 0, defence: 0, taunt: 1 }, 'front');
        const back = character('back', { hp: 100, totalHp: 100, attack: 0, defence: 0, taunt: 1 }, 'back');

        const lowRoll = new HybridCombat([
            { character: farmer, interval: 2, side: 'left' },
            { character: front, interval: 100, side: 'right' },
            { character: back, interval: 100, side: 'right' },
        ], { random: () => 0.1 });
        const lowEvent = lowRoll.next();
        if (lowEvent.kind !== 'auto') throw new Error('expected an auto attack');
        expect(lowEvent.targetId).toBe('front'); // roll 0.1*4 = 0.4 → front's 3-slice

        const highRoll = new HybridCombat([
            {
                character: character('farmer2', { hp: 20, totalHp: 20, attack: 5, defence: 0, speed: 6 }),
                interval: 2,
                side: 'left',
            },
            {
                character: character('front2', { hp: 100, totalHp: 100, attack: 0, defence: 0, taunt: 1 }, 'front'),
                interval: 100,
                side: 'right',
            },
            {
                character: character('back2', { hp: 100, totalHp: 100, attack: 0, defence: 0, taunt: 1 }, 'back'),
                interval: 100,
                side: 'right',
            },
        ], { random: () => 0.9 });
        const highEvent = highRoll.next();
        if (highEvent.kind !== 'auto') throw new Error('expected an auto attack');
        expect(highEvent.targetId).toBe('back2'); // roll 0.9*4 = 3.6 → back's 1-slice
    });
});
