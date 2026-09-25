// Fixed values for the character generator: every species has a name,
// an icon, the stats it starts with at level 1, and what each extra
// level adds. Stats are deterministic (no variance) like the rest of
// the growth system.

export type SpeciesStats = {
    hp: number;
    attack: number;
    defence: number;
    magicDefence: number;
    speed: number;
};

export type SpeciesPreset = {
    name: string;
    icon: string;
    base: SpeciesStats;
    perLevel: SpeciesStats;
    // Item id the generator equips on every character of this species
    // (goblins carry their sticks).
    weaponId?: string;
};

export const SPECIES: Record<string, SpeciesPreset> = {
    goblin: {
        name: 'Goblin',
        icon: '👺',
        base: { hp: 10, attack: 2, defence: 0, magicDefence: 0, speed: 5 },
        perLevel: { hp: 2, attack: 1, defence: 0, magicDefence: 0, speed: 0 },
        weaponId: 'stick',
    },
    farmer: {
        name: 'Farmer',
        icon: '🌾',
        base: { hp: 14, attack: 4, defence: 1, magicDefence: 0, speed: 6 },
        perLevel: { hp: 4, attack: 1, defence: 1, magicDefence: 0, speed: 0 },
    },
    // The dev training dummy: a damage sponge that never fights back.
    dummy: {
        name: 'Training Dummy',
        icon: '🎯',
        base: { hp: 1000, attack: 0, defence: 0, magicDefence: 0, speed: 1 },
        perLevel: { hp: 0, attack: 0, defence: 0, magicDefence: 0, speed: 0 },
    },
} as const;
