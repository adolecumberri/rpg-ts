import { Character, Experience } from '../../../src';
// Loads the enhanced-stat augmentation and seeds DEFAULT_STATS with the
// new stat defaults (magicDefence, critChance, critMultiplier, speed).
import './damage';
import { XP } from '../xp/xpConfig';
import { characterGenerator } from '../generators/characterGenerator';
import { DEFAULT_GROWTH_RATE, DEFAULT_MAX, LEVEL_CAP } from './growth';
import type { StatBlock, StatKey } from './growth';

// Every character levels with the same flat XP requirement (FFTA2 style).
export function flatExperience(): Experience {
    return new Experience({ baseXpToLevel: XP.perLevel, xpGrowthFactor: 1 });
}

// ---------------------------------------------------------------------------
// Deprecated: the fixed starting characters are built with the character
// generator now. These builders stay only for the save system and the
// test fixtures, keeping the legacy growth curves (base → target at the
// level cap) expressed as per-stat ratios, so nothing else moves.
// ---------------------------------------------------------------------------

// The ratio that makes a stat reach `target` at the level cap from
// `base`, over the default per-level gains.
const legacyRatio = (stat: StatKey, base: number, target: number): number =>
    (target - base) / ((LEVEL_CAP - 1) * (DEFAULT_MAX[stat] * DEFAULT_GROWTH_RATE / LEVEL_CAP));

const LEGACY_PROFILES: Record<string, { base: StatBlock; ratios: StatBlock }> = {
    hero: {
        base: { hp: 50, totalHp: 100, attack: 10, defence: 5, magicDefence: 4, speed: 8 },
        ratios: {
            attack: legacyRatio('attack', 10, 200),
            defence: legacyRatio('defence', 5, 44),
            magicDefence: legacyRatio('magicDefence', 4, 40),
            speed: legacyRatio('speed', 8, 37.5),
            totalHp: legacyRatio('totalHp', 100, 1000),
        },
    },
    companion: {
        base: { hp: 40, totalHp: 80, attack: 8, defence: 4, magicDefence: 3, speed: 6 },
        ratios: {
            attack: legacyRatio('attack', 8, 135),
            defence: legacyRatio('defence', 4, 56),
            magicDefence: legacyRatio('magicDefence', 3, 44),
            speed: legacyRatio('speed', 6, 50),
            totalHp: legacyRatio('totalHp', 80, 850),
        },
    },
    ember: {
        base: { hp: 45, totalHp: 90, attack: 9, defence: 3, magicDefence: 5, speed: 5 },
        ratios: {
            attack: legacyRatio('attack', 9, 119),
            defence: legacyRatio('defence', 3, 40),
            magicDefence: legacyRatio('magicDefence', 5, 90),
            speed: legacyRatio('speed', 5, 45),
            totalHp: legacyRatio('totalHp', 90, 900),
        },
    },
};

export function buildHero(): Character {
    return characterGenerator({ id: 'hero', name: 'Hero', profile: LEGACY_PROFILES.hero });
}

export function buildCompanion(): Character {
    return characterGenerator({ id: 'companion', name: 'Companion', profile: LEGACY_PROFILES.companion });
}

export function buildEmber(): Character {
    return characterGenerator({ id: 'ember', name: 'Ember', profile: LEGACY_PROFILES.ember });
}

// Rebuilds a known character by id (used by the save system to restore
// growth functions and other behaviors that cannot be serialized).
export function buildCharacterById(id: string): Character | undefined {
    switch (id) {
        case 'hero':
            return buildHero();
        case 'companion':
            return buildCompanion();
        case 'ember':
            return buildEmber();
        default:
            return undefined;
    }
}
