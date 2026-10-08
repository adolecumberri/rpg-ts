import type { Character } from '../../../../src';
import type { Job, JobStatKey } from '../../jobs/Job';
import type { GrowthProfile } from '../../config/growth';
import { DEFAULT_BASE, STAT_KEYS, resolveGrowth } from '../../config/growth';
// The merged Character.jobId field and the widened Statistics shape
// (magic, speed...) must be visible here for the bonus helpers.
import '../../config/damage';
import { ADVENTURER_JOB } from './AdventurerJob';
import { ARCHER_JOB } from './ArcherJob';
import { HEALER_JOB } from './HealerJob';
import { SOLDIER_JOB } from './SoldierJob';

export { ADVENTURER_JOB, ARCHER_JOB, HEALER_JOB, SOLDIER_JOB };

// Every job a character may hold, in picker order.
export const ALL_JOBS: Job[] = [SOLDIER_JOB, ARCHER_JOB, HEALER_JOB, ADVENTURER_JOB];

const JOBS_BY_ID: Record<string, Job> = ALL_JOBS.reduce(
    (acc: Record<string, Job>, job) => {
        acc[job.id] = job;
        return acc;
    },
    {},
);

// Icons shown next to the job title in the roster and menus.
export const JOB_ICONS: Record<string, string> = {
    archer: '🏹',
    healer: '✨',
    soldier: '⚔️',
    adventurer: '👤',
};

/**
 * The job a character holds right now: the jobId assigned through
 * `setJob` when the player swapped it, or the default job derived
 * from the character id. Undefined for characters without a job.
 */
export function heldJobOf(character: Character): Job | undefined {
    if (character.jobId) {
        const held = JOBS_BY_ID[character.jobId];
        if (held) return held;
    }
    return jobOfCharacter(character.id);
}

/**
 * The default job of a character, derived from its id (the recruit ids
 * carry their class). Undefined for characters without a job.
 */
export function jobOfCharacter(characterId: string): Job | undefined {
    if (characterId === 'player') return SOLDIER_JOB;
    if (characterId === 'arturo' || characterId === 'healer_0') return HEALER_JOB;
    if (characterId.indexOf('archer_') === 0) return ARCHER_JOB;
    if (characterId.indexOf('soldier_') === 0) return SOLDIER_JOB;
    return undefined;
}

/**
 * The growth profile the character levels with: the HELD job's (so
 * switching jobs switches the future gains), the one the generator
 * attached at creation, or the generic default.
 */
export function growthProfileOf(character: Character): GrowthProfile {
    return heldJobOf(character)?.growth ?? character.growthProfile ?? { base: DEFAULT_BASE };
}

/**
 * Adds `levels` level-ups to the character: each one applies the
 * current job's per-level gains on top of the character's own stats.
 * The base never rebases; switching jobs only changes the FUTURE
 * gains. The stats keep their decimals (floats), so the fractional
 * progress of every level carries itself into the next one.
 */
export function applyGrowthLevels(character: Character, levels: number, heal = true): void {
    const resolved = resolveGrowth(growthProfileOf(character));
    for (const stat of STAT_KEYS) {
        if (stat === 'hp') continue;
        character.stats[stat] = (character.stats[stat] ?? DEFAULT_BASE[stat])
            + levels * resolved.gainPerLevel[stat];
    }
    if (heal) {
        character.stats.hp = character.stats.totalHp;
        character.stats.isAlive = 1;
    }
}

/**
 * Wires the live level-up handler: every level adds the CURRENT job's
 * gains (resolved at level-up time, so a job change takes effect from
 * the next level).
 */
export function wireCharacterGrowth(character: Character): void {
    character.experience.onLevelUpHandler = () => applyGrowthLevels(character, 1);
}

/** The job with the given id, if it exists. */
export function jobById(jobId: string): Job | undefined {
    return JOBS_BY_ID[jobId];
}

const STAT_LABELS: Record<JobStatKey, string> = {
    attack: '⚔️ Atq. físico',
    defence: '🛡️ Def. física',
    magicDefence: '🔮 Def. mágica',
    critChance: '🎯 Crit.',
    critMultiplier: '💥 Crit. Mult.',
    speed: '⚡ Rapidez',
    magic: '✨ Poder mágico',
};

// The bonus keys in a stable order, so the helpers below iterate the
// typed statistics directly — no casts to records.
const JOB_STAT_KEYS: JobStatKey[] = [
    'attack',
    'defence',
    'magicDefence',
    'critChance',
    'critMultiplier',
    'speed',
    'magic',
];

/** The stat bonuses of a job as display lines, e.g. "+3 ⚔️ attack". */
export function jobBonusText(job: Job): string {
    const lines: string[] = [];
    for (const stat of JOB_STAT_KEYS) {
        const value = job.statBonuses[stat];
        if (value === undefined || value === 0) continue;
        lines.push(`${value > 0 ? '+' : ''}${value} ${STAT_LABELS[stat]}`);
    }
    return lines.length > 0 ? lines.join(' · ') : 'No stat bonuses';
}

/**
 * Adds the job's stat bonuses straight to the character stats (plain
 * numbers, no statuses). Idempotent per call: call it once when the
 * job is assigned.
 */
export function applyJobBonuses(character: Character, job: Job): void {
    const stats = character.stats;
    for (const stat of JOB_STAT_KEYS) {
        const value = job.statBonuses[stat];
        if (value === undefined) continue;
        stats[stat] = (stats[stat] ?? 0) + value;
    }
}

/**
 * Removes the job's stat bonuses from the character stats. Must be
 * called exactly once per applied job (before a swap or removal).
 */
export function removeJobBonuses(character: Character, job: Job): void {
    const stats = character.stats;
    for (const stat of JOB_STAT_KEYS) {
        const value = job.statBonuses[stat];
        if (value === undefined) continue;
        stats[stat] = (stats[stat] ?? 0) - value;
    }
}
