import type { GrowthProfile } from '../config/growth';
import { DEFAULT_MAX, LEVEL_CAP, resolveGrowth } from '../config/growth';

export type GrowthRowStat = 'attack' | 'defence' | 'magicDefence' | 'magic' | 'speed' | 'totalHp';

export type GrowthRow = {
    stat: GrowthRowStat;
    icon: string;
    // Level-1 value.
    base: number;
    // Value at the level cap: base + (cap − 1) × gain.
    target: number;
    // The per-stat growth ratio (percent): 100 = the default gains.
    ratioPercent: number;
    // The theoretical absolute maximum the gains are computed from.
    cap: number;
};

const GROWTH_ICONS: Record<GrowthRowStat, string> = {
    attack: '⚔️',
    defence: '🛡️',
    magicDefence: '🔮',
    magic: '✨',
    speed: '⚡',
    totalHp: '❤️',
};

export const GROWTH_STAT_LABELS: Record<GrowthRowStat, string> = {
    attack: 'Atq. físico',
    defence: 'Def. física',
    magicDefence: 'Def. mágica',
    magic: 'Poder mágico',
    speed: 'Rapidez',
    totalHp: 'Max HP',
};

/**
 * The growth profile as display rows, one per growing stat: where it
 * starts, where it ends at the level cap, the per-stat ratio and the
 * theoretical maximum. Used by the character details view.
 */
export function growthRowsOf(profile: GrowthProfile): GrowthRow[] {
    const resolved = resolveGrowth(profile);
    const stats: GrowthRowStat[] = ['attack', 'defence', 'magicDefence', 'magic', 'speed', 'totalHp'];

    return stats.map((stat) => ({
        stat,
        icon: GROWTH_ICONS[stat],
        base: resolved.base[stat],
        target: Math.round(
            (resolved.base[stat] + (LEVEL_CAP - 1) * resolved.gainPerLevel[stat]) * 100,
        ) / 100,
        ratioPercent: Math.round((profile.ratios?.[stat] ?? 1) * 100),
        cap: DEFAULT_MAX[stat],
    }));
}

export function levelCap(): number {
    return LEVEL_CAP;
}
