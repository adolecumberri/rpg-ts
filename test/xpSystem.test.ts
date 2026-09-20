import { Character, Experience, Stats } from '../src';
import type { NPC } from '../worldTest/core/types';
import { grantCombatXp } from '../worldTest/core/xp/xpSystem';
import { XP } from '../worldTest/core/xp/xpConfig';
import { WorldSession } from '../worldTest/core/session';
import { buildEmber, buildHero } from '../worldTest/core/config/characters';

function makeChar(id: string, level = 1): Character {
    return new Character({
        id,
        name: id,
        stats: new Stats({ hp: 50, totalHp: 100 }),
        experience: new Experience({ level }),
    });
}

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

describe('individual experience system', () => {
    it('gives the killer 10 XP and every other alive ally 2 XP', () => {
        const killer = makeChar('killer');
        const ally = makeChar('ally');

        const grants = grantCombatXp({ killer, allies: [killer, ally], creatureLevel: 1 });

        const killerGrant = grants.find((grant) => grant.character.id === 'killer')!;
        const allyGrant = grants.find((grant) => grant.character.id === 'ally')!;
        expect(killerGrant.gained).toBe(XP.kill);
        expect(allyGrant.gained).toBe(XP.assist);
        expect(killer.experience.currentXp).toBe(10);
        expect(ally.experience.currentXp).toBe(2);
    });

    it('gives only 1 XP to a killer 5+ levels above the creature', () => {
        const killer = makeChar('killer', 6); // creature level 1 -> gap of 5

        const grants = grantCombatXp({ killer, allies: [killer], creatureLevel: 1 });

        expect(grants[0].gained).toBe(XP.overlevelKill);
    });

    it('gives exactly the custom XP to the killer and nobody else', () => {
        const killer = makeChar('killer', 10); // high level: 100 XP does not level up
        const ally = makeChar('ally');

        const grants = grantCombatXp({ killer, allies: [killer, ally], creatureLevel: 1, customXp: 100 });

        expect(grants).toHaveLength(1);
        expect(grants[0].gained).toBe(100);
        expect(killer.experience.currentXp).toBe(100);
        expect(ally.experience.currentXp).toBe(0);
    });

    it('a custom-XP npc grants exactly one flat level to its killer only', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.addCharacter(buildHero());
        session.team.addCharacter(buildEmber());
        const hero = session.team.getCharacter('hero')!;
        const ember = session.team.getCharacter('ember')!;
        hero.experience.level = 10;
        const emberLevelBefore = ember.experience.level;
        const emberXpBefore = ember.experience.currentXp;

        const spirit = fixtureNpc('sage_spirit', { customXp: 100, xpReward: 0, goldReward: 0 });
        session.finishCombat('won', {
            npc: spirit,
            placeId: 'central_town',
            kills: [{ enemyId: 'sage_spirit', killerId: 'hero' }],
        });

        // 100 xp = exactly one level with the flat FFTA2 curve.
        expect(hero.experience.level).toBe(11);
        expect(hero.experience.currentXp).toBe(0);
        expect(ember.experience.level).toBe(emberLevelBefore);
        expect(ember.experience.currentXp).toBe(emberXpBefore);
    });

    it('a normal kill grants killer XP plus assists through the session', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.addCharacter(buildHero());
        session.team.addCharacter(buildEmber());
        const hero = session.team.getCharacter('hero')!;
        const ember = session.team.getCharacter('ember')!;
        const heroXpBefore = hero.experience.currentXp;
        const emberXpBefore = ember.experience.currentXp;

        const goblin = fixtureNpc('goblin');
        session.finishCombat('won', {
            npc: goblin,
            placeId: 'central_town',
            kills: [{ enemyId: 'goblin', killerId: 'hero' }],
        });

        expect(hero.experience.currentXp).toBe(heroXpBefore + XP.kill);
        expect(ember.experience.currentXp).toBe(emberXpBefore + XP.assist);
    });
});
