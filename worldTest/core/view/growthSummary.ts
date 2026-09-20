import { GROWTH, jobOf } from '../config/growth';
import type { GrowthStats } from '../config/growth';

export type GrowthRow = {
    stat: GrowthStats;
    icon: string;
    // Level-1 value.
    base: number;
    // Value at the level cap: cap × ratio.
    target: number;
    // How much of the job's cap the character reaches (percent).
    ratioPercent: number;
    cap: number;
};

const GROWTH_ICONS: Record<GrowthStats, string> = {
    attack: '⚔️',
    defence: '🛡️',
    magicDefence: '🔮',
    speed: '⚡',
    totalHp: '❤️',
};

export const GROWTH_STAT_LABELS: Record<GrowthStats, string> = {
    attack: 'Attack',
    defence: 'Defence',
    magicDefence: 'Magic Def',
    speed: 'Speed',
    totalHp: 'Max HP',
};

/**
 * The growth profile of a job, one row per growing stat: where it
 * starts, where it ends at the level cap, and the ratio of the cap it
 * reaches. Used by the character details view.
 */
export function growthRowsOf(jobId: string): GrowthRow[] {
    const job = jobOf(jobId);
    const stats = Object.keys(job.caps) as GrowthStats[];

    return stats.map((stat) => ({
        stat,
        icon: GROWTH_ICONS[stat],
        base: job.bases[stat],
        target: Math.round(job.caps[stat] * job.ratios[stat] * 100) / 100,
        ratioPercent: Math.round(job.ratios[stat] * 100),
        cap: job.caps[stat],
    }));
}

export function levelCap(): number {
    return GROWTH.levelCap;
}
