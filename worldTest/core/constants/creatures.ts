import type { GrowthOptions, GrowthProfile, StatBlock } from '../config/growth';

// The creatures the character generator can build. Each one declares
// its level-1 base stats and, optionally, its own growth (max/rate).
// Without one, the default growth applies (60% of the generic
// maximums). Content references creatures ONLY through the Creatures
// constant (Creatures.goblin).

export type CreatureDefinition = {
    id: string;
    name: string;
    icon: string;
    base: StatBlock;
    growth?: GrowthOptions;
};

export const Creatures = {
    goblin: {
        id: 'goblin',
        name: 'Goblin',
        icon: '👺',
        base: { hp: 10, totalHp: 10, attack: 2, defence: 0, magicDefence: 0, speed: 5 },
        growth: {
            // Goblins scale attack and speed, but stay small and dumb.
            ratios: { hp: 0.5, totalHp: 0.5, attack: 0.8, defence: 0.5, magicDefence: 0.3, magic: 0.2, speed: 0.8 },
        },
    },
    farmer: {
        id: 'farmer',
        name: 'Farmer',
        icon: '🌾',
        base: { hp: 14, totalHp: 14, attack: 4, defence: 1, magicDefence: 0, speed: 6 },
        growth: {
            ratios: { hp: 0.6, totalHp: 0.6, attack: 0.7, defence: 0.8, magicDefence: 0.4, magic: 0.2, speed: 0.7 },
        },
    },
    // The dev training dummy: a damage sponge that never fights back
    // and never grows (every ratio 0).
    dummy: {
        id: 'dummy',
        name: 'Training Dummy',
        icon: '🎯',
        base: { hp: 1000, totalHp: 1000, attack: 0, defence: 0, magicDefence: 0, speed: 1 },
        growth: {
            ratios: {
                hp: 0,
                totalHp: 0,
                attack: 0,
                defence: 0,
                magicDefence: 0,
                magic: 0,
                speed: 0,
                critChance: 0,
                critMultiplier: 0,
            },
        },
    },
} as const satisfies Record<string, CreatureDefinition>;

/** The growth profile of a creature constant. */
export function creatureProfile(creature: CreatureDefinition): GrowthProfile {
    return {
        base: creature.base,
        ratios: creature.growth?.ratios,
    };
}
