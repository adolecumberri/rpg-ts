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
//
// The level-1 base follows the same rule for everyone: DEFAULT_BASE is
// the common stats EVERY character starts with. A job's own base is
// its statBonuses, layered on top while the job is held; creatures and
// legacy fixtures declare their complete level-1 values instead. The
// growth profile itself only carries the per-stat RATIOS.
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
    hp: 300,
    totalHp: 300,
    attack: 100,
    defence: 80,
    magicDefence: 80,
    magic: 120,
    speed: 40,
    critChance: 10,
    critMultiplier: 2,
};

// The share of the theoretical maximums a leveling character gains in
// total (60%): the per-level gain is this share divided by LEVEL_CAP.
export const DEFAULT_GROWTH_RATE = 0.6;

// The common stats every character starts from at level 1. A job's
// own level-1 values live in its statBonuses (layered on top of these
// when the job is held); creatures and legacy fixtures declare their
// complete level-1 values instead.
export const DEFAULT_BASE: Record<StatKey, number> = {
    hp: 45,
    totalHp: 45,
    attack: 5,
    defence: 4,
    magicDefence: 4,
    magic: 5,
    speed: 4,
    critChance: 4,
    critMultiplier: 2,
};

// The growth profile: the per-stat growth ratios ONLY (a multiplier
// over the default per-level gain; 1 = default, >1 improves, <1
// worsens, 0 freezes; missing stats use 1). The level-1 base lives
// elsewhere: DEFAULT_BASE is the common start, jobs layer their
// statBonuses on top, creatures and legacy fixtures declare complete
// bases of their own.
export type GrowthProfile = StatBlock;

export type ResolvedGrowth = {
    gainPerLevel: Record<StatKey, number>;
};

/** Resolves the per-level gains of a growth profile: the 60% share of
 *  each theoretical maximum spread over the level cap, times the
 *  profile's ratio (missing ratios use 1). */
export function resolveGrowth(ratios: GrowthProfile): ResolvedGrowth {
    const gainPerLevel = {} as Record<StatKey, number>;
    for (const stat of STAT_KEYS) {
        gainPerLevel[stat] = (DEFAULT_MAX[stat] * DEFAULT_GROWTH_RATE / LEVEL_CAP) * (ratios[stat] ?? 1);
    }
    return { gainPerLevel };
}

/** One stat at the given level (clamped to [1, LEVEL_CAP]):
 *  base + (level − 1) × gain. The base's missing stats inherit the
 *  generic DEFAULT_BASE values. hp mirrors totalHp (a character is
 *  always at full life when it levels). */
export function statAtLevelValue(base: StatBlock, ratios: GrowthProfile, level: number, stat: StatKey): number {
    if (stat === 'hp') return statAtLevelValue(base, ratios, level, 'totalHp');
    const clamped = Math.min(LEVEL_CAP, Math.max(1, level));
    const value = (base[stat] ?? DEFAULT_BASE[stat]) + (clamped - 1) * resolveGrowth(ratios).gainPerLevel[stat];
    return Math.round(value * 100) / 100;
}

/** The full stat block at the given level, from the base and ratios. */
export function statBlockAtLevel(base: StatBlock, ratios: GrowthProfile, level: number): Record<StatKey, number> {
    const stats = {} as Record<StatKey, number>;
    for (const stat of STAT_KEYS) {
        stats[stat] = statAtLevelValue(base, ratios, level, stat);
    }
    return stats;
}

/**
 * Rewrites the character's base stats to their level values (the
 * base's missing stats inherit DEFAULT_BASE). With `heal` (default)
 * the character also returns to full hp.
 */
export function applyGrowthProfile(
    character: Character,
    base: StatBlock,
    ratios: GrowthProfile,
    level: number,
    heal = true,
): void {
    const stats = statBlockAtLevel(base, ratios, level);
    Object.assign(character.stats, stats);
    if (heal) {
        character.stats.hp = character.stats.totalHp;
        character.stats.isAlive = 1;
    }
}
