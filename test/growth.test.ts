import { Character, Item } from '../src';
import { WorldSession } from '../worldTest/core/session';
import { buildCompanion, buildHero } from '../worldTest/core/config/characters';
import {
    DEFAULT_BASE,
    DEFAULT_GROWTH_RATE,
    DEFAULT_MAX,
    LEVEL_CAP,
    applyGrowthProfile,
    resolveGrowth,
    statBlockAtLevel,
} from '../worldTest/core/config/growth';
import type { GrowthProfile } from '../worldTest/core/config/growth';
import {
    HEALER_JOB,
    SOLDIER_JOB,
    applyGrowthLevels,
    applyJobBonuses,
    growthProfileOf,
    removeJobBonuses,
    wireCharacterGrowth,
} from '../worldTest/core/constants/jobs';
import { characterGenerator } from '../worldTest/core/generators/characterGenerator';
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

// The hero's profile (the deprecated builder keeps it; its ratios
// reproduce the legacy base → target curve exactly).
const HERO_PROFILE: GrowthProfile = {
    base: { hp: 50, totalHp: 100, attack: 10, defence: 5, magicDefence: 4, speed: 8 },
    ratios: {
        attack: 190 / (99 * (DEFAULT_MAX.attack * DEFAULT_GROWTH_RATE / LEVEL_CAP)),
        defence: 39 / (99 * (DEFAULT_MAX.defence * DEFAULT_GROWTH_RATE / LEVEL_CAP)),
        magicDefence: 36 / (99 * (DEFAULT_MAX.magicDefence * DEFAULT_GROWTH_RATE / LEVEL_CAP)),
        speed: 29.5 / (99 * (DEFAULT_MAX.speed * DEFAULT_GROWTH_RATE / LEVEL_CAP)),
        totalHp: 900 / (99 * (DEFAULT_MAX.totalHp * DEFAULT_GROWTH_RATE / LEVEL_CAP)),
    },
};

describe('deterministic growth', () => {
    it('keeps the level-1 stats exactly at the configured bases', () => {
        const hero = buildHero();

        expect(statBlockAtLevel(HERO_PROFILE, 1).attack).toBe(10);
        expect(hero.getStat('attack')).toBe(10);
        expect(hero.getStat('speed')).toBe(8);
    });

    it('reaches the legacy targets at the level cap through its ratios', () => {
        const stats = statBlockAtLevel(HERO_PROFILE, LEVEL_CAP);

        expect(stats.attack).toBe(200); // 10 + 99 * (190 / 99)
        expect(stats.defence).toBe(44); // 5 + 99 * (39 / 99)
        expect(stats.speed).toBe(37.5);
        expect(stats.magicDefence).toBe(40);
        expect(stats.totalHp).toBe(1000);
    });

    it('gains a flat amount per level (linear)', () => {
        const level50 = statBlockAtLevel(HERO_PROFILE, 50);
        // progress = 49 levels
        const expectedAttack = 10 + (200 - 10) * (49 / 99);

        expect(level50.attack).toBeCloseTo(expectedAttack, 2);
    });

    it('clamps levels beyond the cap', () => {
        expect(statBlockAtLevel(HERO_PROFILE, 999)).toEqual(statBlockAtLevel(HERO_PROFILE, LEVEL_CAP));
    });

    it('applyGrowthProfile rewrites stats and heals to full', () => {
        const hero = buildHero();
        hero.stats.hp = 1;
        hero.stats.isAlive = 0;

        applyGrowthProfile(hero, HERO_PROFILE, 50);

        expect(hero.getStat('attack')).toBeCloseTo(10 + 190 * (49 / 99), 2);
        expect(hero.stats.hp).toBe(hero.stats.totalHp);
        expect(hero.stats.isAlive).toBe(1);
    });

    it('levels up through the wired growth handler with flat 100 xp', () => {
        const hero = buildHero();
        wireCharacterGrowth(hero);
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
        applyGrowthProfile(hero, HERO_PROFILE, LEVEL_CAP);
        hero.equipment.equipOrReplace(rustySword(), hero);

        expect(hero.getStat('attack')).toBe(202); // 200 cap + 2 item
    });

    it('gains 60% of the theoretical maximums spread over the levels by default', () => {
        const resolved = resolveGrowth({ base: DEFAULT_BASE });
        // attack: DEFAULT_MAX.attack * 0.6 / 100 per level
        expect(resolved.gainPerLevel.attack).toBe(DEFAULT_MAX.attack * DEFAULT_GROWTH_RATE / LEVEL_CAP);
        // totalHp: DEFAULT_MAX.totalHp * 0.6 / 100 per level
        expect(resolved.gainPerLevel.totalHp).toBe(DEFAULT_MAX.totalHp * DEFAULT_GROWTH_RATE / LEVEL_CAP);

        const atCap = statBlockAtLevel({ base: DEFAULT_BASE }, LEVEL_CAP);
        const expectedAttack = Math.round(
            (DEFAULT_BASE.attack + (LEVEL_CAP - 1) * resolved.gainPerLevel.attack) * 100,
        ) / 100;
        expect(atCap.attack).toBe(expectedAttack);
    });

    it('characters without a job or profile grow with the generic default', () => {
        const profile = growthProfileOf(new Character({ id: 'north_resident' }));
        const gain = DEFAULT_MAX.attack * DEFAULT_GROWTH_RATE / LEVEL_CAP;
        const expected = Math.round((DEFAULT_BASE.attack + (LEVEL_CAP - 1) * gain) * 100) / 100;
        expect(statBlockAtLevel(profile, LEVEL_CAP).attack).toBe(expected);
    });

    it('exposes growth rows for the details view', () => {
        const rows = growthRowsOf(HERO_PROFILE);
        expect(rows).toHaveLength(6);
        const attack = rows.find((row) => row.stat === 'attack')!;
        const ratio = HERO_PROFILE.ratios?.attack ?? 1;
        expect(attack.base).toBe(10);
        expect(attack.target).toBe(200);
        expect(attack.ratioPercent).toBe(Math.round(ratio * 100));
        expect(attack.cap).toBe(DEFAULT_MAX.attack);
    });

    it('the job constants carry their bases and ratios', () => {
        expect(SOLDIER_JOB.growth?.base.attack).toBe(6);
        expect(SOLDIER_JOB.growth?.ratios?.attack).toBe(1.2);
    });
});

describe('the job career', () => {
    it('accumulates the gains of every job the character leveled with', () => {
        const character = characterGenerator({ job: SOLDIER_JOB, level: 1, id: 'career' });
        const baseAttack = character.getStat('attack');
        const soldierGain = DEFAULT_MAX.attack * DEFAULT_GROWTH_RATE / LEVEL_CAP * 1.2; // 0.864

        // 9 levels as a soldier.
        applyGrowthLevels(character, 9);
        expect(character.getStat('attack')).toBeCloseTo(baseAttack + 9 * soldierGain, 2);

        // Switch to healer: the base and the accumulated soldier gains
        // stay; only the future gains change.
        removeJobBonuses(character, SOLDIER_JOB);
        character.jobId = HEALER_JOB.id;
        applyJobBonuses(character, HEALER_JOB);
        const afterSwitch = character.getStat('attack');
        const healerGain = DEFAULT_MAX.attack * DEFAULT_GROWTH_RATE / LEVEL_CAP * 0.6; // 0.432

        applyGrowthLevels(character, 20);
        expect(character.getStat('attack')).toBeCloseTo(afterSwitch + 20 * healerGain, 2);
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
        applyGrowthProfile(hero, HERO_PROFILE, 95); // the stats at 95

        session.train(10);

        expect(hero.experience.level).toBe(LEVEL_CAP);
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
