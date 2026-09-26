import { Character, Stats } from '../src';
import type { Statistics } from '../src';
import { StatusInstance } from '../src/classes/StatusInstance';
import { applyCover, consumeCover, coverOf } from '../worldTest/core/combat/cover';
import { resolveGeneralAttack } from '../worldTest/core/damage/general';
import { resolveBasicAttack } from '../worldTest/core/damage/character';
import { resolveSkillEffect } from '../worldTest/core/combat/skillEffects';
import { specOf } from '../worldTest/core/skills';
import { bleedingStatus } from '../worldTest/core/statuses';
import { WorldSession } from '../worldTest/core/session';

const noCrit = () => 1;

function character(id: string, stats: Partial<Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

function coveredHit(
    ally: Character,
    attacker: Character,
): { total: number } {
    return resolveBasicAttack(attacker, ally, { random: noCrit });
}

describe('the Cover skill', () => {
    it('covers an ally, never the caster, and stays in the catalog', () => {
        const paladin = character('paladin', { hp: 50, totalHp: 50 });
        const ally = character('ally', { hp: 30, totalHp: 30 });
        const cover = specOf('cover')!;
        expect(cover.targeting).toBe('ALLY');
        expect(cover.cover).toEqual({ percent: 60 });

        const result = resolveSkillEffect(cover, paladin, [ally]);
        expect(result.effects[0].statusesOnTarget).toEqual(['Covered']);
        expect(coverOf(ally)?.coverer).toBe(paladin);
        expect(coverOf(ally)?.percent).toBe(60);
        expect(coverOf(paladin)).toBeUndefined();
    });

    it('redirects the share to the coverer and is consumed by the hit', () => {
        const paladin = character('paladin', { hp: 50, totalHp: 50, defence: 0 });
        const ally = character('ally', { hp: 30, totalHp: 30, defence: 0 });
        const enemy = character('enemy', { hp: 99, totalHp: 99, attack: 10 });
        applyCover(ally, paladin, 60);

        const hit = coveredHit(ally, enemy);
        expect(hit.total).toBe(4); // the ally keeps 40%
        expect(ally.stats.hp).toBe(26);
        expect(paladin.stats.hp).toBe(44); // took the other 60%
        expect(coverOf(ally)).toBeUndefined(); // single use

        // The next hit lands fully on the ally.
        const second = coveredHit(ally, enemy);
        expect(second.total).toBe(10);
        expect(ally.stats.hp).toBe(16);
        expect(paladin.stats.hp).toBe(44);
    });

    it('resolves the covered share with the coverer\'s own mitigation', () => {
        const paladin = character('paladin', { hp: 50, totalHp: 50, defence: 50 });
        const ally = character('ally', { hp: 30, totalHp: 30, defence: 0 });
        const enemy = character('enemy', { hp: 99, totalHp: 99, attack: 10 });
        applyCover(ally, paladin, 60);

        const hit = coveredHit(ally, enemy);
        expect(hit.total).toBe(4); // ally share still 40% of the raw 10
        expect(paladin.stats.hp).toBe(47); // 60% of 10 * 50/(50+50) = 3
    });

    it('the last cover applied to an ally is the one in effect', () => {
        const paladinA = character('pala', { hp: 50, totalHp: 50, defence: 0 });
        const paladinB = character('palb', { hp: 50, totalHp: 50, defence: 0 });
        const ally = character('ally', { hp: 30, totalHp: 30, defence: 0 });
        const enemy = character('enemy', { hp: 99, totalHp: 99, attack: 10 });

        applyCover(ally, paladinA, 60);
        applyCover(ally, paladinB, 50);

        const covered = Array.from(ally.statusManager.statuses.values())
            .filter((status) => status.definition.name === 'Covered');
        expect(covered).toHaveLength(1); // refresh, not stacking
        expect(coverOf(ally)?.coverer).toBe(paladinB);

        const hit = coveredHit(ally, enemy);
        expect(hit.total).toBe(5); // 50% stays with the ally
        expect(paladinB.stats.hp).toBe(45);
        expect(paladinA.stats.hp).toBe(50);
    });

    it('does not redirect when the coverer is down, and keeps the cover', () => {
        const paladin = character('paladin', { hp: 0, totalHp: 50, defence: 0 });
        const ally = character('ally', { hp: 30, totalHp: 30, defence: 0 });
        const enemy = character('enemy', { hp: 99, totalHp: 99, attack: 10 });
        applyCover(ally, paladin, 60);

        const hit = coveredHit(ally, enemy);
        expect(hit.total).toBe(10); // the ally takes everything
        expect(ally.stats.hp).toBe(20);
        expect(paladin.stats.hp).toBe(0);
        expect(coverOf(ally)).toBeDefined(); // not consumed
    });

    it('status ticks are not hits: bleeding never triggers the cover', () => {
        const paladin = character('paladin', { hp: 50, totalHp: 50, defence: 0 });
        const ally = character('ally', { hp: 30, totalHp: 30, defence: 0 });
        const enemy = character('enemy', { hp: 99, totalHp: 99, attack: 10 });
        applyCover(ally, paladin, 60);
        ally.statusManager.addStatusInstance(new StatusInstance({ definition: bleedingStatus() }));

        ally.statusManager.trigger('after_turn'); // Bleeding: the ally loses 1 hp
        expect(ally.stats.hp).toBe(29);
        expect(paladin.stats.hp).toBe(50); // the tick never reached the coverer
        expect(coverOf(ally)).toBeDefined(); // still waiting for a real hit

        const hit = coveredHit(ally, enemy);
        expect(hit.total).toBe(4);
        expect(paladin.stats.hp).toBe(44); // the real hit was covered
    });

    it('skill damage on a covered ally redirects too', () => {
        const mage = character('mage', { hp: 99, totalHp: 99 });
        const paladin = character('paladin', { hp: 50, totalHp: 50, defence: 0, magicDefence: 0 });
        const ally = character('ally', { hp: 30, totalHp: 30, defence: 0, magicDefence: 0 });
        applyCover(ally, paladin, 60);

        const fire = specOf('fire_breath')!; // 20 + 30% attack = 20 magical
        const result = resolveSkillEffect(fire, mage, [ally]);

        expect(result.effects[0].damage).toBe(8); // the ally keeps 40%
        expect(ally.stats.hp).toBe(22);
        expect(paladin.stats.hp).toBe(38); // took 12
        expect(coverOf(ally)).toBeUndefined();
    });

    it('consuming the cover removes the status', () => {
        const paladin = character('paladin', { hp: 50, totalHp: 50 });
        const ally = character('ally', { hp: 30, totalHp: 30 });
        applyCover(ally, paladin, 60);

        expect(consumeCover(ally)).toBe(true);
        expect(coverOf(ally)).toBeUndefined();
        expect(
            Array.from(ally.statusManager.statuses.values())
                .filter((status) => status.definition.name === 'Covered'),
        ).toHaveLength(0);
    });

    it('nobody learns Cover yet: the skill stays in the catalog only', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const everyone = [session.team.getCharacter('player')!, ...session.roster.all()];
        for (const member of everyone) {
            expect(session.availableSkillIds(member)).not.toContain('cover');
        }
    });

    it('reports the cover in the attack note', () => {
        const paladin = character('paladin', { hp: 50, totalHp: 50, defence: 0 });
        const ally = character('ally', { hp: 30, totalHp: 30, defence: 0 });
        const enemy = character('enemy', { hp: 99, totalHp: 99, attack: 10 });
        applyCover(ally, paladin, 60);

        const outcome = resolveGeneralAttack(enemy, ally, noCrit);
        expect(outcome.note).toContain('paladin covers ally');
        expect(outcome.note).toContain('-6');
    });
});
