import { Character } from '../../../src';
import { buildCharacterById, flatExperience } from '../config/characters';
import type { SavedCharacter } from './saveData';

/**
 * Rebuilds a character from saved data. Known characters (hero,
 * companion, ember) are rebuilt with their factories so growth
 * functions and other behaviors are restored; unknown characters
 * (e.g., recruited npcs) are rebuilt generically.
 */
export function buildCharacterFromSave(saved: SavedCharacter): Character {
    const character = buildCharacterById(saved.id) ?? new Character({
        id: saved.id,
        name: saved.name,
        experience: flatExperience(),
    });

    character.name = saved.name;
    character.stats.attack = saved.attack;
    character.stats.defence = saved.defence;
    character.stats.hp = saved.hp;
    character.stats.totalHp = saved.totalHp;
    character.stats.isAlive = saved.isAlive;
    character.stats.fatigue = saved.fatigue ?? 0;
    character.experience.level = saved.level;
    character.experience.currentXp = saved.currentXp;
    // The worldTest stats the historic fields don't cover (speed,
    // magic...): saves made before them load at the seeded defaults.
    // Typed directly through the enhanced Statistics.
    const extra = saved.extraStats;
    if (extra) {
        if (extra.speed !== undefined) character.stats.speed = extra.speed;
        if (extra.magic !== undefined) character.stats.magic = extra.magic;
        if (extra.magicDefence !== undefined) character.stats.magicDefence = extra.magicDefence;
        if (extra.critChance !== undefined) character.stats.critChance = extra.critChance;
        if (extra.critMultiplier !== undefined) character.stats.critMultiplier = extra.critMultiplier;
    }
    // Formation row: saves made before positions existed load at front.
    if (saved.position === 'front' || saved.position === 'center' || saved.position === 'back') {
        character.position = saved.position;
    }

    return character;
}
