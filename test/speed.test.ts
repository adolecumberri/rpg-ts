import { Character, Stats } from '../src';
import { compareBySpeed, intervalFromSpeed } from '../worldTest/core/config/speed';
import { WorldSession } from '../worldTest/core/session';
import { buildIntervalCombatants } from '../worldTest/core/config/intervalBattle';
import { buildIntervalStressCombatants } from '../worldTest/core/config/intervalStressTest';
import { buildCompanion, buildEmber, buildHero } from '../worldTest/core/config/characters';

describe('intervalFromSpeed', () => {
    it('converts speed into the historical intervals (24 / speed, rounded up)', () => {
        expect(intervalFromSpeed(8)).toBe(3);
        expect(intervalFromSpeed(6)).toBe(4);
        expect(intervalFromSpeed(5)).toBe(5);
        expect(intervalFromSpeed(4)).toBe(6);
        expect(intervalFromSpeed(12)).toBe(2);
    });

    it('never produces an interval below 1', () => {
        expect(intervalFromSpeed(100)).toBe(1);
        expect(intervalFromSpeed(24)).toBe(1);
    });
});

describe('compareBySpeed', () => {
    function fighter(id: string, speed: number): Character {
        return new Character({ id, name: id, stats: new Stats({ speed }) });
    }

    it('orders faster characters first', () => {
        const fast = fighter('fast', 9);
        const slow = fighter('slow', 3);

        expect([slow, fast].sort(compareBySpeed)).toEqual([fast, slow]);
    });

    it('breaks speed ties by name for a deterministic order', () => {
        const a = fighter('a', 5);
        const b = fighter('b', 5);

        expect([b, a].sort(compareBySpeed)).toEqual([a, b]);
    });
});

describe('speed-driven interval battles', () => {
    it('derives the real battle intervals from the party speed', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.addCharacter(buildHero());
        session.team.addCharacter(buildCompanion());
        session.team.addCharacter(buildEmber());
        const { left, right } = buildIntervalCombatants(session);

        const intervals = new Map(left.map((entry) => [entry.character.id, entry.interval]));
        expect(intervals.get('hero')).toBe(3); // speed 8
        expect(intervals.get('companion')).toBe(4); // speed 6
        expect(intervals.get('ember')).toBe(5); // speed 5

        const enemyIntervals = new Map(right.map((entry) => [entry.character.id, entry.interval]));
        expect(enemyIntervals.get('goblin')).toBe(4); // speed 6
        expect(enemyIntervals.get('troll')).toBe(6); // speed 4
    });

    it('derives the stress battle intervals from speed', () => {
        const { left, right } = buildIntervalStressCombatants('small');

        const monk = left.find((entry) => entry.character.id === 'stress-monk')!;
        expect(monk.interval).toBe(3); // speed 8

        const wolf = right.find((entry) => entry.character.id === 'stress-wolf-a')!;
        expect(wolf.interval).toBe(2); // speed 12
    });
});
