import type { Character } from '../../../../src';
import type { Job, JobStatKey } from '../../jobs/Job';
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
