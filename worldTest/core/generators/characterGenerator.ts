import { Character, Stats } from '../../../src';
import { SPECIES } from '../config/species';
import type { SpeciesStats } from '../config/species';
import { DEFAULT_ITEM_TABLE } from '../items';

// The character generator: builds a Character from a species preset
// plus a level (base stats + per-level growth, deterministic) with
// optional overrides so content can pass whatever it wants.

export type CharacterGeneratorOptions = {
    // Ids must be unique inside a battle; fights pass explicit ids.
    id?: string;
    name?: string;
    // Any stat overrides applied on top of the leveled preset.
    stats?: Partial<SpeciesStats>;
};

export function characterGenerator(
    species: string,
    level: number,
    options: CharacterGeneratorOptions = {},
): Character {
    const preset = SPECIES[species];
    if (!preset) {
        throw new Error(`Unknown species: ${species}`);
    }

    const leveled: SpeciesStats = {
        hp: preset.base.hp + preset.perLevel.hp * (level - 1),
        attack: preset.base.attack + preset.perLevel.attack * (level - 1),
        defence: preset.base.defence + preset.perLevel.defence * (level - 1),
        magicDefence: preset.base.magicDefence + preset.perLevel.magicDefence * (level - 1),
        speed: preset.base.speed + preset.perLevel.speed * (level - 1),
    };

    const merged = { ...leveled, ...(options.stats ?? {}) };

    const character = new Character({
        id: options.id ?? `${species}_${level}`,
        name: options.name ?? preset.name,
        stats: new Stats({
            hp: merged.hp,
            totalHp: merged.hp,
            attack: merged.attack,
            defence: merged.defence,
            magicDefence: merged.magicDefence,
            speed: merged.speed,
        }),
    });
    // Reference to the generic character it was built from, so content
    // and dev tools can link back to the species preset.
    character.speciesId = species;
    // The species' signature weapon (goblins carry their sticks).
    if (preset.weaponId && DEFAULT_ITEM_TABLE.has(preset.weaponId)) {
        character.equipment.equipOrReplace(DEFAULT_ITEM_TABLE.createItem(preset.weaponId), character);
    }
    return character;
}
