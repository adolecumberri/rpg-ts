import { Character, Stats } from '../src';
import { StatusInstance } from '../src/classes/StatusInstance';
import { burnStatus, poisonStatus } from '../worldTest/core/statuses';

// Refresh model: re-applying a status with the same name resets its
// duration instead of stacking another instance.
describe('status re-application (refresh model)', () => {
    it('re-applying burn keeps a single instance', () => {
        const character = new Character({ id: 'c', stats: new Stats({ hp: 100, totalHp: 100 }) });
        character.statusManager.addStatusInstance(new StatusInstance({ definition: burnStatus() }));
        character.statusManager.addStatusInstance(new StatusInstance({ definition: burnStatus() }));

        expect(character.statusManager.statuses.size).toBe(1);
    });

    it('re-applying resets the countdown to the full duration', () => {
        const character = new Character({ id: 'c', stats: new Stats({ hp: 100, totalHp: 100 }) });
        character.statusManager.addStatusInstance(new StatusInstance({ definition: burnStatus() }));

        character.statusManager.trigger('after_turn'); // tick 1 -> 92, 2 rounds left
        expect(character.stats.hp).toBe(92);

        character.statusManager.addStatusInstance(new StatusInstance({ definition: burnStatus() })); // refresh

        // the refreshed burn still has 3 rounds left
        character.statusManager.trigger('after_turn'); // tick -> 84
        character.statusManager.trigger('after_turn'); // tick -> 76
        character.statusManager.trigger('after_turn'); // tick -> 68, expires after
        expect(character.statusManager.statuses.size).toBe(0);

        character.statusManager.trigger('after_turn'); // no more damage
        expect(character.stats.hp).toBe(68);
    });

    it('damage never stacks beyond a single burn per tick', () => {
        const character = new Character({ id: 'c', stats: new Stats({ hp: 100, totalHp: 100 }) });
        character.statusManager.addStatusInstance(new StatusInstance({ definition: burnStatus() }));
        character.statusManager.addStatusInstance(new StatusInstance({ definition: burnStatus() }));
        character.statusManager.addStatusInstance(new StatusInstance({ definition: burnStatus() }));

        character.statusManager.trigger('after_turn');

        expect(character.stats.hp).toBe(92); // 100 - 8 (one burn only)
        expect(character.statusManager.statuses.size).toBe(1);
    });

    it('different statuses still coexist', () => {
        const character = new Character({ id: 'c', stats: new Stats({ hp: 100, totalHp: 100 }) });
        character.statusManager.addStatusInstance(new StatusInstance({ definition: burnStatus() }));
        character.statusManager.addStatusInstance(new StatusInstance({ definition: poisonStatus() }));

        expect(character.statusManager.statuses.size).toBe(2);
    });
});
