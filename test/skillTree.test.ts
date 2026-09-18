import { WorldSession } from '../worldTest/core/session';
import { SkillTree } from '../worldTest/core/skillTree/skillTree';
import { LevelCondition } from '../worldTest/core/skillTree/conditions';

describe('unlock conditions', () => {
    it('LevelCondition checks the character level', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const hero = session.team.getCharacter('hero')!;
        const context = { character: hero, session, tree: new SkillTree([]) };
        const condition = new LevelCondition(2);

        expect(condition.isMet(context)).toBe(false);
        hero.experience.gain(50); // hero needs 50 xp for level 2
        expect(condition.isMet(context)).toBe(true);
    });
});

describe('skill trees', () => {
    it('does not unlock a node until its conditions are met', () => {
        const session = new WorldSession({ random: () => 0.5 });

        const result = session.unlockNode('hero', 'warcry');

        expect(result.ok).toBe(false);
        expect(session.skillTreeOf('hero')!.isLearned('warcry')).toBe(false);
        expect(session.availableSkillIds(session.team.getCharacter('hero')!)).not.toContain('warcry');
    });

    it('unlocks after leveling and grants the skill', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const hero = session.team.getCharacter('hero')!;
        hero.experience.gain(50); // level 2

        expect(session.unlockNode('hero', 'warcry').ok).toBe(true);
        expect(session.availableSkillIds(hero)).toContain('warcry');
    });

    it('requires the previous node before unlocking the next', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const hero = session.team.getCharacter('hero')!;
        hero.experience.gain(50); // level 2

        expect(session.unlockNode('hero', 'chain_bolt').ok).toBe(false); // warcry not learned yet

        session.unlockNode('hero', 'warcry');
        expect(session.unlockNode('hero', 'chain_bolt').ok).toBe(true);
    });

    it('gates nodes by owned items', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const hero = session.team.getCharacter('hero')!;
        hero.experience.level = 4;

        // the team starts with a rusty sword, so blade dance is unlockable
        expect(session.unlockNode('hero', 'blade_dance').ok).toBe(true);
    });

    it('applies stat bonuses when a node is learned', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.unlocked.add('east_unlocked');
        const hero = session.team.getCharacter('hero')!;
        const attackBefore = hero.stats.attack;
        const totalHpBefore = hero.stats.totalHp;
        const hpBefore = hero.stats.hp;

        expect(session.unlockNode('hero', 'veteran').ok).toBe(true);

        expect(hero.stats.attack).toBe(attackBefore + 5);
        expect(hero.stats.totalHp).toBe(totalHpBefore + 10);
        expect(hero.stats.hp).toBe(hpBefore + 10);
    });

    it('cannot unlock a node twice', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const hero = session.team.getCharacter('hero')!;
        hero.experience.gain(50);

        expect(session.unlockNode('hero', 'warcry').ok).toBe(true);
        expect(session.unlockNode('hero', 'warcry')).toMatchObject({ ok: false });
    });

    it('keeps trees separate per character', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const hero = session.team.getCharacter('hero')!;
        const companion = session.team.getCharacter('companion')!;

        expect(session.unlockNode('hero', 'warcry').ok).toBe(false); // level 1
        expect(session.skillTreeOf('companion')!.isLearned('warcry')).toBe(false);
        expect(session.skillTreeOf('companion')!.node('warcry')).toBeUndefined();

        companion.experience.gain(1000); // reaches level 3
        expect(session.unlockNode('companion', 'fireball').ok).toBe(true);
        expect(session.availableSkillIds(companion)).toContain('fireball');
        expect(session.availableSkillIds(hero)).toEqual(['fireball', 'regenerate']); // hero kit unchanged
    });
});
