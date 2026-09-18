import { Character } from '../../../src';
import { buildCharacterById } from '../config/characters';
import type { SavedCharacter } from './saveData';

/**
 * Rebuilds a character from saved data. Known characters (hero,
 * companion, ember) are rebuilt with their factories so growth
 * functions and other behaviors are restored; unknown characters
 * (e.g., recruited npcs) are rebuilt generically.
 */
export function buildCharacterFromSave(saved: SavedCharacter): Character {
    const character = buildCharacterById(saved.id) ?? new Character({ id: saved.id, name: saved.name });

    character.name = saved.name;
    character.stats.attack = saved.attack;
    character.stats.defence = saved.defence;
    character.stats.hp = saved.hp;
    character.stats.totalHp = saved.totalHp;
    character.stats.isAlive = saved.isAlive;
    character.experience.level = saved.level;
    character.experience.currentXp = saved.currentXp;

    return character;
}
