import type { GrowthProfile, StatBlock } from '../config/growth';
import { DEFAULT_BASE, DEFAULT_MAX, LEVEL_CAP, resolveGrowth } from '../config/growth';

export type GrowthRowStat = 'attack' | 'defence' | 'magicDefence' | 'magic' | 'speed' | 'totalHp';

export type GrowthRow = {
    stat: GrowthRowStat;
    // Level-1 value (the base's missing stats inherit DEFAULT_BASE).
    base: number;
    // Value at the level cap: base + (cap − 1) × gain.
    target: number;
    // The per-stat growth ratio (percent): 100 = the default gains.
    ratioPercent: number;
    // The theoretical absolute maximum the gains are computed from.
    cap: number;
};

/**
 * The growth of one stat as a display row: where it starts (the base),
 * where it ends at the level cap, the per-stat ratio and the
 * theoretical maximum. Used by the character details view.
 */
export function growthRowsOf(base: StatBlock, ratios: GrowthProfile): GrowthRow[] {
    const gains = resolveGrowth(ratios).gainPerLevel;
    const stats: GrowthRowStat[] = ['attack', 'defence', 'magicDefence', 'magic', 'speed', 'totalHp'];

    return stats.map((stat) => {
        const levelOne = base[stat] ?? DEFAULT_BASE[stat];
        return {
            stat,
            base: levelOne,
            target: Math.round((levelOne + (LEVEL_CAP - 1) * gains[stat]) * 100) / 100,
            ratioPercent: Math.round((ratios[stat] ?? 1) * 100),
            cap: DEFAULT_MAX[stat],
        };
    });
}

export function levelCap(): number {
    return LEVEL_CAP;
}
