import { Hunt } from '../worldTest/core/events/hunt';

function sequence(values: number[]): () => number {
    let index = 0;
    return () => values[index++] ?? 0.99;
}

describe('hunt loop', () => {
    const goblins = { id: 'goblins', label: 'Goblins', chancePercent: 17, minCount: 1, maxCount: 3 };
    const wolf = { id: 'wolf', label: 'Wolf', chancePercent: 2 };
    const cow = { id: 'cow', label: 'Cow', chancePercent: 5, growPercent: 5 };

    it('returns nothing when no roll passes', () => {
        const hunt = new Hunt([goblins, wolf, cow], () => 0.99);

        expect(hunt.iterate()).toEqual({ kind: 'nothing' });
        expect(hunt.iterationsDone()).toBe(1);
    });

    it('hits the goblin group with a count between 1 and 3', () => {
        // goblin roll 0.1 -> 10 < 17 hit; count roll 0.5 -> 1 + floor(0.5 * 3) = 2
        const hunt = new Hunt([goblins], sequence([0.1, 0.5]));

        expect(hunt.iterate()).toEqual({ kind: 'hit', encounterId: 'goblins', count: 2 });
    });

    it('grows chances after every iteration and caps them at 100', () => {
        const hunt = new Hunt([cow], () => 0.99);
        for (let index = 0; index < 5; index++) hunt.iterate();
        expect(hunt.chanceOf('cow')).toBe(30); // 5 + 5 * 5

        for (let index = 0; index < 20; index++) hunt.iterate();
        expect(hunt.chanceOf('cow')).toBe(100);
    });

    it('eventually finds the cow when the grown chance passes the roll', () => {
        // iteration 1: chance 5, roll 99 -> nothing (chance -> 10)
        // iteration 2: chance 10, roll 99 -> nothing (chance -> 15)
        // iteration 3: chance 15, roll 14 -> hit (chance -> 20)
        const hunt = new Hunt([cow], sequence([0.99, 0.99, 0.14]));

        expect(hunt.iterate()).toEqual({ kind: 'nothing' });
        expect(hunt.iterate()).toEqual({ kind: 'nothing' });
        expect(hunt.iterate()).toEqual({ kind: 'hit', encounterId: 'cow', count: 1 });
        expect(hunt.chanceOf('cow')).toBe(20);
    });

    it('restores a saved state', () => {
        const hunt = new Hunt([cow], () => 0.99);
        for (let index = 0; index < 7; index++) hunt.iterate();
        const chances = hunt.encountersOf();

        const restored = new Hunt([{ ...cow, chancePercent: 5 }], () => 0.99);
        restored.restoreState(7, chances.map((entry) => ({
            encounterId: entry.id,
            chancePercent: entry.chancePercent,
        })));

        expect(restored.iterationsDone()).toBe(7);
        expect(restored.chanceOf('cow')).toBe(hunt.chanceOf('cow'));
    });
});
