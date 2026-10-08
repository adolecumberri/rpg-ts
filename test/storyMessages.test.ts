import { WorldSession } from '../worldTest/core/session';
import { MessageQueue } from '../worldTest/core/messages';
import { FIGHTS } from '../worldTest/core/config/fights';
import { characterGenerator } from '../worldTest/core/generators/characterGenerator';
import { Creatures } from '../worldTest/core/constants/creatures';
import { Items } from '../worldTest/core/constants/items';
import { DEFAULT_GROWTH_RATE, DEFAULT_MAX, LEVEL_CAP } from '../worldTest/core/config/growth';

describe('global message queue', () => {
    it('peeks and advances lines one at a time', () => {
        const queue = new MessageQueue();
        expect(queue.hasPending()).toBe(false);
        expect(queue.peek()).toBeUndefined();

        queue.push([{ speaker: 'A', text: 'one' }, { text: 'two' }]);
        expect(queue.hasPending()).toBe(true);
        expect(queue.peek()).toEqual({ speaker: 'A', text: 'one' });

        queue.next();
        expect(queue.peek()).toEqual({ text: 'two' });
        queue.next();
        expect(queue.peek()).toBeUndefined();
        expect(queue.hasPending()).toBe(false);
    });

    it('clears all pending lines', () => {
        const queue = new MessageQueue();
        queue.push([{ text: 'a' }, { text: 'b' }]);
        queue.clear();
        expect(queue.hasPending()).toBe(false);
    });
});

describe('character generator', () => {
    it('builds a goblin from its creature constant, scaling stats by level', () => {
        const level1 = characterGenerator({ creature: Creatures.goblin, level: 1, id: 'goblin_a' });
        expect(level1.name).toBe('Goblin');
        expect(level1.stats.hp).toBe(10);
        expect(level1.stats.attack).toBe(2);
        expect(level1.speciesId).toBe('goblin'); // reference to the generic constant

        const hpGain = DEFAULT_MAX.hp * DEFAULT_GROWTH_RATE / LEVEL_CAP * 0.5;
        const attackGain = DEFAULT_MAX.attack * DEFAULT_GROWTH_RATE / LEVEL_CAP * 0.8;
        const level3 = characterGenerator({ creature: Creatures.goblin, level: 3, id: 'goblin_b' });
        expect(level3.stats.hp).toBe(Math.round((10 + 2 * hpGain) * 100) / 100);
        expect(level3.stats.attack).toBe(Math.round((2 + 2 * attackGain) * 100) / 100);
    });

    it('accepts stat overrides and custom names', () => {
        const boss = characterGenerator({
            creature: Creatures.goblin,
            level: 1,
            id: 'boss',
            name: 'Goblin Boss',
            stats: { hp: 30, attack: 6 },
            portrait: 'goblin',
        });
        expect(boss.name).toBe('Goblin Boss');
        expect(boss.stats.hp).toBe(30);
        expect(boss.stats.attack).toBe(6);
        // The picture override is stamped on the character at creation.
        expect(boss.portraitId).toBe('goblin');
    });

    it('rejects a config without creature, job or profile', () => {
        expect(() => characterGenerator({ level: 1 })).toThrow(
            'characterGenerator needs a creature, a job or a profile.',
        );
    });
});

describe('fights as constants', () => {
    it('the dev training dummy is a damage sponge that never fights back', () => {
        const fight = FIGHTS.dev_dummy;
        expect(fight.mode).toBe('turn');
        const dummy = fight.enemies()[0];
        expect(dummy.id).toBe('training_dummy');
        expect(dummy.name).toBe('Training Dummy');
        expect(dummy.stats.hp).toBe(1000);
        expect(dummy.getStat('attack')).toBe(0);
        expect(dummy.getStat('speed')).toBe(1);
    });
});

describe('character kits', () => {
    it('goblins carry their sticks and the recruits carry their class kits', () => {
        const session = new WorldSession({ random: () => 0.5 });

        const goblin = characterGenerator({ creature: Creatures.goblin, level: 1, id: 'goblin_gear', hand: Items.stick });
        expect(goblin.equipment.get('weapon')?.id).toBe('stick');
        expect(goblin.stats.attack).toBe(2); // raw constant unchanged
        expect(goblin.getStat('attack')).toBe(3); // +1 from the stick

        // The Order Army classes: archers harass, healers support,
        // soldiers lead. Their kits come from their character ids.
        expect(session.availableSkillIds(session.roster.character('archer_0')!)).toEqual([
            'defend', 'fast_draw', 'weak_point',
        ]);
        expect(session.availableSkillIds(session.roster.character('arturo')!)).toEqual([
            'defend', 'dispel', 'cure',
        ]);
        expect(session.availableSkillIds(session.roster.character('soldier_0')!)).toEqual([
            'defend', 'impetu', 'first_aid',
        ]);

        // The player enlisted as a soldier: sack plus the sword and the
        // outfit in the loadout holes.
        const player = session.team.getCharacter('player')!;
        expect(player.equipment.get('bag')?.id).toBe('sack');
        expect(player.loadout?.holes?.[0]?.id).toBe('sword');
        expect(player.loadout?.holes?.[1]?.id).toBe('farmer_outfit');
    });
});
