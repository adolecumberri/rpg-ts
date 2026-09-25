import { Character, Stats } from '../src';
import { StatusInstance } from '../src/classes/StatusInstance';
import { burnStatus } from '../worldTest/core/statuses';
import { WorldSession } from '../worldTest/core/session';
import { buildHero } from '../worldTest/core/config/characters';
import type { NPC } from '../worldTest/core/types';

function fixtureNpc(id: string, overrides: Partial<NPC> = {}): NPC {
    return {
        id,
        character: new Character({ id, name: id, stats: new Stats({ hp: 30, totalHp: 30, attack: 6, defence: 0 }) }),
        talk: '…',
        xpReward: 10,
        goldReward: 5,
        respawns: true,
        ...overrides,
    };
}

describe('combat flows', () => {
    it('fireball does not one-shot a fresh 50 hp enemy: the direct hit leaves 10, burn finishes it later', () => {
        const troll = new Character({ id: 'troll', stats: new Stats({ hp: 50, totalHp: 50 }) });

        troll.stats.hp -= 40; // fireball direct hit
        expect(troll.stats.hp).toBe(10);
        expect(troll.stats.isAlive).toBe(1);

        troll.statusManager.addStatusInstance(new StatusInstance({ definition: burnStatus() }));
        troll.statusManager.trigger('after_turn'); // burn tick 1: 10 -> 2
        expect(troll.stats.hp).toBe(2);
        expect(troll.stats.isAlive).toBe(1);

        troll.statusManager.trigger('after_turn'); // burn tick 2 kills
        expect(troll.stats.hp).toBe(0);
        expect(troll.stats.isAlive).toBe(0);
    });

    it('resets the fought npc when the party loses, so rematches start fresh', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const goblin = fixtureNpc('goblin');
        goblin.character.stats.hp = 10; // damaged in the lost battle

        session.finishCombat('lost', { npc: goblin, placeId: 'forest' });

        expect(goblin.character.stats.hp).toBe(goblin.character.stats.totalHp);
        expect(goblin.character.stats.isAlive).toBe(1);
        expect(session.currentPlaceId).toBe('farm');
    });

    it('defeated grunt npcs respawn at full hp for the next fight', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.addCharacter(buildHero());
        const goblin = fixtureNpc('goblin');
        goblin.character.stats.hp = 3;

        session.finishCombat('won', {
            npc: goblin,
            placeId: 'forest',
            kills: [{ enemyId: 'goblin', killerId: 'hero' }],
        });

        expect(goblin.character.stats.hp).toBe(goblin.character.stats.totalHp);
    });

    it('fleeing heals the npc, grants nothing and stays in place', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.addCharacter(buildHero());
        const goblin = fixtureNpc('goblin');
        goblin.character.stats.hp = 4;
        const goldBefore = session.team.gold;
        const xpBefore = session.team.getCharacter('hero')!.experience.currentXp;

        const result = session.finishCombat('fled', { npc: goblin, placeId: 'forest' });

        expect(goblin.character.stats.hp).toBe(goblin.character.stats.totalHp);
        expect(goblin.character.stats.isAlive).toBe(1);
        expect(result.drops).toEqual([]);
        expect(result.leveled).toBe(false);
        expect(session.team.gold).toBe(goldBefore);
        expect(session.team.getCharacter('hero')!.experience.currentXp).toBe(xpBefore);
        expect(session.currentPlaceId).toBe('farm');
        expect(result.message).toBe('You fled the battle.');
    });
});
