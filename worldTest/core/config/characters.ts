import { Character, Experience, Stats } from '../../../src';
// Loads the enhanced-stat augmentation and seeds DEFAULT_STATS with the
// new stat defaults (magicDefence, critChance, critMultiplier, speed).
import './damage';
import { GROWTH, wireGrowth } from './growth';
import { XP } from '../xp/xpConfig';

// Every character levels with the same flat XP requirement (FFTA2 style).
export function flatExperience(): Experience {
    return new Experience({ baseXpToLevel: XP.perLevel, xpGrowthFactor: 1 });
}

// Fixed values and behaviors for the starting characters. The base
// stats come from the growth table so level-ups and factories always
// agree on the level-1 values.
export function buildHero(): Character {
    const hero = new Character({
        id: 'hero',
        name: 'Hero',
        stats: new Stats(GROWTH.jobs.hero.bases),
        experience: flatExperience(),
    });
    wireGrowth(hero, 'hero');
    return hero;
}

export function buildCompanion(): Character {
    const companion = new Character({
        id: 'companion',
        name: 'Companion',
        stats: new Stats(GROWTH.jobs.companion.bases),
        experience: flatExperience(),
    });
    wireGrowth(companion, 'companion');
    return companion;
}

export function buildEmber(): Character {
    const ember = new Character({
        id: 'ember',
        name: 'Ember',
        stats: new Stats(GROWTH.jobs.ember.bases),
        experience: flatExperience(),
    });
    wireGrowth(ember, 'ember');
    return ember;
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
