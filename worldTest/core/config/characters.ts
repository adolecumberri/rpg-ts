import { Character, Experience, Stats } from '../../../src';

// Fixed values and behaviors for the starting characters.
export function buildHero(): Character {
    const hero = new Character({
        id: 'hero',
        name: 'Hero',
        stats: new Stats({ hp: 50, totalHp: 100, attack: 10, defence: 5 }),
        experience: new Experience({ growthFunction: ({ level }) => level * 50 }),
    });
    hero.experience.onLevelUpHandler = () => {
        hero.stats.attack += 2;
        hero.stats.defence += 1;
        hero.stats.totalHp += 10;
        hero.stats.hp = hero.stats.totalHp;
    };
    return hero;
}

export function buildCompanion(): Character {
    return new Character({
        id: 'companion',
        name: 'Companion',
        stats: new Stats({ hp: 40, totalHp: 80, attack: 8, defence: 4 }),
    });
}

export function buildEmber(): Character {
    return new Character({
        id: 'ember',
        name: 'Ember',
        stats: new Stats({ hp: 45, totalHp: 90, attack: 9, defence: 3 }),
    });
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
