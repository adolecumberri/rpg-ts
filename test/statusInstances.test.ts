import { Character, Stats } from '../src';
import { StatusInstance, type StatusDurationTemporal } from '../src/classes/StatusInstance';
import { regenStatus } from '../worldTest/core/statuses';

describe('regeneration instances per character', () => {
    function remainingTurns(character: Character): number {
        const status = Array.from(character.statusManager.statuses.values())[0];
        return (status.definition.duration as StatusDurationTemporal).value ?? 0;
    }

    it('each team member has its own independent regeneration instance', () => {
        const hero = new Character({ id: 'hero', stats: new Stats({ hp: 50, totalHp: 100 }) });
        const ember = new Character({ id: 'ember', stats: new Stats({ hp: 50, totalHp: 100 }) });

        hero.statusManager.addStatusInstance(new StatusInstance({ definition: regenStatus() }));
        ember.statusManager.addStatusInstance(new StatusInstance({ definition: regenStatus() }));

        // Ticking only the hero does not affect the ember.
        hero.statusManager.trigger('turn_end');
        hero.statusManager.trigger('turn_end');
        expect(hero.stats.hp).toBe(66); // 50 + 8 + 8
        expect(ember.stats.hp).toBe(50);

        expect(remainingTurns(hero)).toBe(1);
        expect(remainingTurns(ember)).toBe(3);

        // Re-applying to the hero resets only the hero's countdown.
        ember.statusManager.trigger('turn_end'); // ember 3 -> 2
        hero.statusManager.addStatusInstance(new StatusInstance({ definition: regenStatus() }));

        expect(remainingTurns(hero)).toBe(3); // refreshed
        expect(remainingTurns(ember)).toBe(2); // untouched by the hero's re-apply
    });
});
