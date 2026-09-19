import { Character, IntervalCombat, Stats } from '../src';
import type { IntervalCombatant } from '../src';
import { WorldSession } from '../worldTest/core/session';
import { grantIntervalKillXp } from '../worldTest/core/config/intervalBattle';
import { XP } from '../worldTest/core/xp/xpConfig';

function combatant(id: string, interval: number, hp: number, attack: number, defence = 0): IntervalCombatant {
    return {
        character: new Character({
            id,
            name: id,
            stats: new Stats({ hp, totalHp: hp, attack, defence }),
        }),
        interval,
    };
}

describe('interval combat', () => {
    it('acts at the multiples of the interval (interval 3 -> ticks 3, 6, 9)', () => {
        const hero = combatant('hero', 3, 100, 10);
        const dummy = combatant('dummy', 100, 1000, 0, 0); // never acts in range

        const result = new IntervalCombat({ maxTicks: 10, randomTarget: false }).resolve([hero], [dummy]);

        expect(result.turns.map((turn) => turn.tick)).toEqual([3, 6, 9]);
        expect(result.winner).toBe('draw'); // the dummy survives
    });

    it('a combatant with interval 5 acts at ticks 5 and 10', () => {
        const hero = combatant('hero', 5, 100, 10);
        const dummy = combatant('dummy', 100, 1000, 0, 0);

        const result = new IntervalCombat({ maxTicks: 11, randomTarget: false }).resolve([hero], [dummy]);

        expect(result.turns.map((turn) => turn.tick)).toEqual([5, 10]);
    });

    it('smaller intervals act more often', () => {
        const fast = combatant('fast', 2, 100, 1);
        const slow = combatant('slow', 5, 100, 1);
        const dummy = combatant('dummy', 100, 1000, 0, 0);

        const result = new IntervalCombat({ maxTicks: 10, randomTarget: false }).resolve([fast, slow], [dummy]);

        const fastTurns = result.turns.filter((turn) => turn.actorId === 'fast').length;
        const slowTurns = result.turns.filter((turn) => turn.actorId === 'slow').length;
        expect(fastTurns).toBe(5); // ticks 2, 4, 6, 8, 10
        expect(slowTurns).toBe(2); // ticks 5, 10
    });

    it('resolves a battle to a winner with both sides acting', () => {
        const hero = combatant('hero', 3, 100, 10);
        const goblin = combatant('goblin', 5, 25, 4);

        const result = new IntervalCombat({ randomTarget: false }).resolve([hero], [goblin]);

        expect(result.turns.map((turn) => turn.tick)).toEqual([3, 5, 6, 9]);
        expect(result.winner).toBe('left');
        expect(result.rightSurvivors).toEqual([]);
        expect(goblin.character.stats.hp).toBe(0);
    });

    it('dead combatants stop acting', () => {
        const hero = combatant('hero', 2, 100, 20);
        const goblin = combatant('goblin', 3, 30, 4);

        const result = new IntervalCombat({ maxTicks: 20, randomTarget: false }).resolve([hero], [goblin]);

        // the goblin dies at tick 4 and must not act again
        const goblinTurns = result.turns.filter((turn) => turn.actorId === 'goblin');
        expect(goblinTurns.map((turn) => turn.tick)).toEqual([3]);
    });

    it('orders simultaneous actors by interval (fastest first)', () => {
        const fast = combatant('fast', 2, 100, 1);
        const slow = combatant('slow', 4, 100, 1);
        const dummy = combatant('dummy', 100, 1000, 0, 0);

        const result = new IntervalCombat({ maxTicks: 4, randomTarget: false }).resolve([fast, slow], [dummy]);

        const tick4Actors = result.turns.filter((turn) => turn.tick === 4).map((turn) => turn.actorId);
        expect(tick4Actors).toEqual(['fast', 'slow']);
    });

    it('reaches a draw when nobody can die before maxTicks', () => {
        const left = combatant('left', 3, 100, 0);
        const right = combatant('right', 4, 100, 0);

        const result = new IntervalCombat({ maxTicks: 20, randomTarget: false }).resolve([left], [right]);

        expect(result.winner).toBe('draw');
        expect(result.ticks).toBe(20);
    });

    it('rejects invalid intervals', () => {
        const hero = combatant('hero', 0, 100, 10);
        const goblin = combatant('goblin', 5, 25, 4);

        expect(() => new IntervalCombat().resolve([hero], [goblin])).toThrow();
    });
});

describe('interval battle xp', () => {
    it('grants kill and assist xp when a character kills an opponent', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const hero = session.team.getCharacter('hero')!;
        const ember = session.team.getCharacter('ember')!;
        const heroXp = hero.experience.currentXp;
        const emberXp = ember.experience.currentXp;

        const outcome = grantIntervalKillXp(session, 'hero');

        expect(hero.experience.currentXp).toBe(heroXp + XP.kill);
        expect(ember.experience.currentXp).toBe(emberXp + XP.assist);
        expect(outcome.message).toContain('Hero +10');
    });

    it('gives only 1 xp to a killer 5+ levels above the creature', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const hero = session.team.getCharacter('hero')!;
        hero.experience.level = 10;
        const heroXp = hero.experience.currentXp;

        grantIntervalKillXp(session, 'hero');

        expect(hero.experience.currentXp).toBe(heroXp + XP.overlevelKill);
    });
});
