import { Character, Stats } from '../src';
import { StatusInstance } from '../src/classes/StatusInstance';
import { attackUpStatus, burnStatus, poisonStatus, regenStatus } from '../worldTest/core/statuses';

describe('status trigger timing', () => {
    it('regeneration does not heal on add — only at the character\'s turn end (turn_end)', () => {
        const character = new Character({ id: 'c', stats: new Stats({ hp: 50, totalHp: 100 }) });

        character.statusManager.addStatusInstance(new StatusInstance({ definition: regenStatus() }));

        expect(character.stats.hp).toBe(50); // no immediate tick
    });

    it('regeneration ticks exactly 3 times at turn_end and then expires', () => {
        const character = new Character({ id: 'c', stats: new Stats({ hp: 50, totalHp: 100 }) });
        character.statusManager.addStatusInstance(new StatusInstance({ definition: regenStatus() }));

        character.statusManager.trigger('after_turn'); // wrong moment: nothing happens
        expect(character.stats.hp).toBe(50);

        character.statusManager.trigger('turn_end'); // tick 1
        expect(character.stats.hp).toBe(58);

        character.statusManager.trigger('turn_end'); // tick 2
        expect(character.stats.hp).toBe(66);

        character.statusManager.trigger('turn_end'); // tick 3 (expires after)
        expect(character.stats.hp).toBe(74);

        character.statusManager.trigger('turn_end'); // expired: no more healing
        expect(character.stats.hp).toBe(74);
        expect(character.statusManager.statuses.size).toBe(0);
    });

    it('burn damages only at after_turn and expires after 3 ticks', () => {
        const character = new Character({ id: 'c', stats: new Stats({ hp: 50, totalHp: 100 }) });
        character.statusManager.addStatusInstance(new StatusInstance({ definition: burnStatus() }));

        expect(character.stats.hp).toBe(50); // no damage on add

        character.statusManager.trigger('after_turn');
        character.statusManager.trigger('after_turn');
        character.statusManager.trigger('after_turn');
        expect(character.stats.hp).toBe(26); // 50 - 8*3

        character.statusManager.trigger('after_turn');
        expect(character.stats.hp).toBe(26); // expired
    });

    it('poison behaves like burn with its own damage', () => {
        const character = new Character({ id: 'c', stats: new Stats({ hp: 40, totalHp: 100 }) });
        character.statusManager.addStatusInstance(new StatusInstance({ definition: poisonStatus() }));

        character.statusManager.trigger('after_turn');
        expect(character.stats.hp).toBe(34); // 40 - 6
    });

    it('attack up buff applies immediately on add and is cleaned when it expires', () => {
        const character = new Character({ id: 'c', stats: new Stats({ attack: 10 }) });
        character.statusManager.addStatusInstance(new StatusInstance({ definition: attackUpStatus() }));

        expect(character.getStat('attack')).toBe(20); // +10 immediately

        character.statusManager.trigger('before_turn');
        character.statusManager.trigger('before_turn'); // duration exhausted
        expect(character.getStat('attack')).toBe(10); // modifier cleaned on expiry
        expect(character.statusManager.statuses.size).toBe(0);
    });
});
