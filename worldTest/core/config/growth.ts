import type { Character } from '../../../src';

// ---------------------------------------------------------------------------
// The growth system (deterministic): stats are a pure function of the
// character's level, its base values and its per-stat ratios.
//
//   stat(level) = base + (level − 1) × gain(stat)
//   gain(stat)  = DEFAULT_MAX[stat] × DEFAULT_GROWTH_RATE / LEVEL_CAP × ratio[stat]
//
// DEFAULT_MAX holds the theoretical absolute values a stat may reach.
// A leveling character gains 60% of that value spread over the levels
// (ratio 1 ≈ 60% of DEFAULT_MAX at the cap). Every job and every
// creature only alters the growth through its per-stat ratios
// (soldiers gain more hp/attack per level, less magic...). Items stack
// on top through their own modifier sources, so they are never capped
// by this system.
// ---------------------------------------------------------------------------

export const LEVEL_CAP = 100;

// Every stat the growth system may grow. Add a new stat here (and its
// generic base/max values below) and every profile can grow it.
export type StatKey =
    | 'hp'
    | 'totalHp'
    | 'attack'
    | 'defence'
    | 'magicDefence'
    | 'magic'
    | 'speed'
    | 'critChance'
    | 'critMultiplier';

export const STAT_KEYS: StatKey[] = [
    'hp',
    'totalHp',
    'attack',
    'defence',
    'magicDefence',
    'magic',
    'speed',
    'critChance',
    'critMultiplier',
];

// A block of stat values: profiles declare the stats they care about;
// the missing ones inherit the generic values.
export type StatBlock = Partial<Record<StatKey, number>>;

// The theoretical absolute values a stat may reach (the reference the
// per-level gains are computed from).
export const DEFAULT_MAX: Record<StatKey, number> = {
    hp: 800,
    totalHp: 800,
    attack: 300,
    defence: 200,
    magicDefence: 200,
    magic: 450,
    speed: 40,
    critChance: 40,
    critMultiplier: 2,
};

// The share of the theoretical maximums a leveling character gains in
// total (60%): the per-level gain is this share divided by LEVEL_CAP.
export const DEFAULT_GROWTH_RATE = 0.6;

// The generic level-1 values (a character without creature or job
// profile grows from here).
export const DEFAULT_BASE: Record<StatKey, number> = {
    hp: 100,
    totalHp: 100,
    attack: 10,
    defence: 4,
    magicDefence: 2,
    magic: 8,
    speed: 6,
    critChance: 4,
    critMultiplier: 2,
};

export type GrowthProfile = {
    // The level-1 values (missing stats inherit the generic bases).
    base: StatBlock;
    // The per-stat growth alteration: a multiplier over the default
    // per-level gain (1 = default, >1 improves, <1 worsens, 0 freezes).
    // Missing stats use 1.
    ratios?: StatBlock;
};

export type ResolvedGrowth = {
    base: Record<StatKey, number>;
    gainPerLevel: Record<StatKey, number>;
};

/**
 * A growth profile without its base: creatures and jobs declare their
 * own level-1 bases separately, so their growth is only the optional
 * per-stat `ratios`.
 */
export type GrowthOptions = Pick<GrowthProfile, 'ratios'>;

/** Fills the profile's gaps: bases from the generic bases, ratios from
 *  the default (1). The per-level gain of a stat is the 60% share of
 *  its theoretical maximum spread over the level cap, times the ratio. */
export function resolveGrowth(profile: GrowthProfile): ResolvedGrowth {
    const ratios = profile.ratios ?? {};
    const base = {} as Record<StatKey, number>;
    const gainPerLevel = {} as Record<StatKey, number>;
    for (const stat of STAT_KEYS) {
        base[stat] = profile.base[stat] ?? DEFAULT_BASE[stat];
        gainPerLevel[stat] = (DEFAULT_MAX[stat] * DEFAULT_GROWTH_RATE / LEVEL_CAP) * (ratios[stat] ?? 1);
    }
    return { base, gainPerLevel };
}

/** One stat at the given level (clamped to [1, LEVEL_CAP]). hp mirrors
 *  totalHp (a character is always at full life when it levels). */
export function statAtLevelValue(profile: GrowthProfile, level: number, stat: StatKey): number {
    const resolved = resolveGrowth(profile);
    if (stat === 'hp') return statAtLevelValue(profile, level, 'totalHp');
    const clamped = Math.min(LEVEL_CAP, Math.max(1, level));
    const value = resolved.base[stat] + (clamped - 1) * resolved.gainPerLevel[stat];
    return Math.round(value * 100) / 100;
}

/** The full stat block at the given level. */
export function statBlockAtLevel(profile: GrowthProfile, level: number): Record<StatKey, number> {
    const stats = {} as Record<StatKey, number>;
    for (const stat of STAT_KEYS) {
        stats[stat] = statAtLevelValue(profile, level, stat);
    }
    return stats;
}

/**
 * Rewrites the character's base stats to their level values. With
 * `heal` (default) the character also returns to full hp.
 */
export function applyGrowthProfile(character: Character, profile: GrowthProfile, level: number, heal = true): void {
    const stats = statBlockAtLevel(profile, level);
    Object.assign(character.stats, stats);
    if (heal) {
        character.stats.hp = character.stats.totalHp;
        character.stats.isAlive = 1;
    }
}
