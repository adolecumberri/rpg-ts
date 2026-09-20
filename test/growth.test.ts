import { Item } from '../src';
import { WorldSession } from '../worldTest/core/session';
import { buildCompanion, buildHero } from '../worldTest/core/config/characters';
import { GROWTH, applyGrowthAtLevel, jobIdOf, jobNameOf, statsAtLevel, wireGrowth } from '../worldTest/core/config/growth';
import { growthRowsOf } from '../worldTest/core/view/growthSummary';

function rustySword(): Item {
    return new Item({
        id: 'rusty_sword',
        name: 'Rusty Sword',
        category: 'weapon',
        slot: 'weapon',
        effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 2 }],
    });
}

describe('deterministic growth', () => {
    it('keeps the level-1 stats exactly at the configured bases', () => {
        const hero = buildHero();

        expect(statsAtLevel('hero', 1)).toEqual({
            attack: 10,
            defence: 5,
            magicDefence: 4,
            speed: 8,
            totalHp: 100,
        });
        expect(hero.getStat('attack')).toBe(10);
        expect(hero.getStat('speed')).toBe(8);
    });

    it('reaches cap × ratio at the level cap', () => {
        const stats = statsAtLevel('hero', GROWTH.levelCap);

        expect(stats.attack).toBe(200); // cap 200 * ratio 1
        expect(stats.defence).toBe(44); // cap 80 * ratio 0.55
        expect(stats.speed).toBe(37.5); // cap 50 * ratio 0.75
        expect(stats.magicDefence).toBe(40); // cap 80 * ratio 0.5
        expect(stats.totalHp).toBe(1000);
    });

    it('is linear between base and target', () => {
        const level50 = statsAtLevel('hero', 50);
        // progress = 49/99
        const expectedAttack = 10 + (200 - 10) * (49 / 99);

        expect(level50.attack).toBeCloseTo(expectedAttack, 2);
    });

    it('clamps levels beyond the cap', () => {
        expect(statsAtLevel('hero', 999)).toEqual(statsAtLevel('hero', GROWTH.levelCap));
    });

    it('applyGrowthAtLevel rewrites stats and heals to full', () => {
        const hero = buildHero();
        hero.stats.hp = 1;
        hero.stats.isAlive = 0;

        applyGrowthAtLevel(hero, 'hero', 50);

        expect(hero.getStat('attack')).toBeCloseTo(10 + 190 * (49 / 99), 2);
        expect(hero.stats.hp).toBe(hero.stats.totalHp);
        expect(hero.stats.isAlive).toBe(1);
    });

    it('levels up through the wired growth handler with flat 100 xp', () => {
        const hero = buildHero();
        wireGrowth(hero, 'hero');
        const attackBefore = hero.getStat('attack');

        hero.experience.gain(100);

        expect(hero.experience.level).toBe(2);
        expect(hero.getStat('attack')).toBeGreaterThan(attackBefore);
        expect(hero.getStat('attack')).toBeCloseTo(10 + 190 / 99, 2);
    });

    it('keeps the xp-to-next-level flat at 100 for every level', () => {
        const hero = buildHero();
        expect(hero.experience.getXpToNextLevel()).toBe(100);

        hero.experience.gain(100); // level 2
        expect(hero.experience.getXpToNextLevel()).toBe(100);

        hero.experience.gain(100); // level 3
        expect(hero.experience.getXpToNextLevel()).toBe(100);
    });

    it('items stack on top of the grown (and capped) stats', () => {
        const hero = buildHero();
        applyGrowthAtLevel(hero, 'hero', GROWTH.levelCap);
        hero.equipment.equipOrReplace(rustySword(), hero);

        expect(hero.getStat('attack')).toBe(202); // 200 cap + 2 item
    });

    it('recruits fall back to the default job', () => {
        expect(jobIdOf('north_resident')).toBe('default');
        expect(statsAtLevel('north_resident', GROWTH.levelCap).attack).toBe(96); // 120 * 0.8
    });

    it('exposes job names and growth rows for the details view', () => {
        expect(jobNameOf('hero')).toBe('Soldier');
        expect(jobNameOf('companion')).toBe('Ranger');
        expect(jobNameOf('ember')).toBe('Spellblade');
        expect(jobNameOf('north_resident')).toBe('Adventurer');

        const rows = growthRowsOf('hero');
        expect(rows).toHaveLength(5);
        expect(rows.find((row) => row.stat === 'attack')).toEqual({
            stat: 'attack',
            icon: '⚔️',
            base: 10,
            target: 200,
            ratioPercent: 100,
            cap: 200,
        });
    });
});

describe('growth training shortcut', () => {
    it('levels the whole party by the given amount and heals them', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.addCharacter(buildHero());
        session.team.addCharacter(buildCompanion());
        const hero = session.team.getCharacter('hero')!;
        hero.stats.hp = 3;

        const result = session.train(10);

        expect(hero.experience.level).toBe(11);
        expect(hero.stats.hp).toBe(hero.stats.totalHp);
        expect(hero.getStat('attack')).toBeCloseTo(10 + 190 * (10 / 99), 2);
        expect(session.team.getCharacter('companion')!.experience.level).toBe(11);
        expect(result.message).toContain('Hero Lv 11');
    });

    it('clamps training at the level cap', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.addCharacter(buildHero());
        const hero = session.team.getCharacter('hero')!;
        hero.experience.level = 95;

        session.train(10);

        expect(hero.experience.level).toBe(GROWTH.levelCap);
        expect(hero.getStat('attack')).toBe(200);
    });
});

describe('growth through the save system', () => {
    it('restores stats from the deterministic curve and keeps the saved hp', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.addCharacter(buildHero());
        const hero = session.team.getCharacter('hero')!;
        session.train(4);
        hero.stats.hp = 17; // wounded

        const restored = WorldSession.fromSave(session.exportSave());
        const restoredHero = restored.team.getCharacter('hero')!;

        expect(restoredHero.experience.level).toBe(5);
        expect(restoredHero.getStat('attack')).toBeCloseTo(10 + 190 * (4 / 99), 2);
        expect(restoredHero.stats.hp).toBe(17);
    });
});
