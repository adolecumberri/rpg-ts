import type { Character } from '../../../src';

// Fixed values of the level growth system (deterministic: stats are a
// pure function of the character's level and job).
//
// stat(level) = base + (cap × ratio − base) × (level − 1) / (levelCap − 1)
//
// Items stack on top through their own modifier sources, so they are
// never capped by this table.

export const GROWTH = {
    levelCap: 100,
    // Placeholder jobs until the real per-race jobs exist: one profile
    // per current character plus a default for recruited npcs.
    jobs: {
        hero: {
            name: 'Soldier',
            bases: { attack: 10, defence: 5, magicDefence: 4, speed: 8, hp: 50, totalHp: 100 },
            caps: { attack: 200, defence: 80, magicDefence: 80, speed: 50, totalHp: 1000 },
            ratios: { attack: 1, defence: 0.55, magicDefence: 0.5, speed: 0.75, totalHp: 1 },
        },
        companion: {
            name: 'Ranger',
            bases: { attack: 8, defence: 4, magicDefence: 3, speed: 6, hp: 40, totalHp: 80 },
            caps: { attack: 150, defence: 80, magicDefence: 80, speed: 50, totalHp: 850 },
            ratios: { attack: 0.9, defence: 0.7, magicDefence: 0.55, speed: 1, totalHp: 1 },
        },
        ember: {
            name: 'Spellblade',
            bases: { attack: 9, defence: 3, magicDefence: 5, speed: 5, hp: 45, totalHp: 90 },
            caps: { attack: 140, defence: 80, magicDefence: 90, speed: 50, totalHp: 900 },
            ratios: { attack: 0.85, defence: 0.5, magicDefence: 1, speed: 0.9, totalHp: 1 },
        },
        default: {
            name: 'Adventurer',
            bases: { attack: 5, defence: 1, magicDefence: 0, speed: 6, hp: 20, totalHp: 20 },
            caps: { attack: 120, defence: 60, magicDefence: 60, speed: 40, totalHp: 600 },
            ratios: { attack: 0.8, defence: 0.8, magicDefence: 0.8, speed: 0.8, totalHp: 0.8 },
        },
    },
} as const;

export type GrowthStats = 'attack' | 'defence' | 'magicDefence' | 'speed' | 'totalHp';

export type GrowthJob = {
    name: string;
    bases: Record<GrowthStats | 'hp', number>;
    caps: Record<GrowthStats, number>;
    ratios: Record<GrowthStats, number>;
};

export function jobOf(jobId: string): GrowthJob {
    const jobs = GROWTH.jobs as Record<string, GrowthJob>;
    return jobs[jobId] ?? jobs.default;
}

/**
 * The stats a character of the job has at the given level (clamped to
 * [1, levelCap]). Purely deterministic.
 */
export function statsAtLevel(jobId: string, level: number): Record<GrowthStats, number> {
    const job = jobOf(jobId);
    const clamped = Math.min(GROWTH.levelCap, Math.max(1, level));
    const progress = (clamped - 1) / (GROWTH.levelCap - 1);

    const compute = (stat: GrowthStats): number => {
        const base = job.bases[stat];
        const target = job.caps[stat] * job.ratios[stat];
        return Math.round((base + (target - base) * progress) * 100) / 100;
    };

    return {
        attack: compute('attack'),
        defence: compute('defence'),
        magicDefence: compute('magicDefence'),
        speed: compute('speed'),
        totalHp: compute('totalHp'),
    };
}

/**
 * Rewrites the character's base stats to their level values. With
 * `heal` (default) the character also returns to full hp.
 */
export function applyGrowthAtLevel(character: Character, jobId: string, level: number, heal = true): void {
    const stats = statsAtLevel(jobId, level);
    Object.assign(character.stats, {
        attack: stats.attack,
        defence: stats.defence,
        magicDefence: stats.magicDefence,
        speed: stats.speed,
        totalHp: stats.totalHp,
    });
    if (heal) {
        character.stats.hp = character.stats.totalHp;
        character.stats.isAlive = 1;
    }
}

/**
 * Attaches the job's growth to the character's level-up events.
 */
export function wireGrowth(character: Character, jobId: string): void {
    character.experience.onLevelUpHandler = () => applyGrowthAtLevel(character, jobId, character.experience.level);
}

// Which job each known character grows with (recruits use 'default').
export const CHARACTER_JOBS: Record<string, string> = {
    hero: 'hero',
    companion: 'companion',
    ember: 'ember',
};

export function jobIdOf(characterId: string): string {
    return CHARACTER_JOBS[characterId] ?? 'default';
}

export function jobNameOf(jobId: string): string {
    return jobOf(jobId).name;
}
