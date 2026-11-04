import type { Character } from '../../../src';
import type { SkillSpec } from '../skills';
import { definitionOf, resolveSkill, specOf } from '../skills';
import { heldJobOf, jobById } from '../constants/jobs';
import type { Job, JobProgressState, JobSkillPlan } from './Job';

// ---------------------------------------------------------------------------
// Job progression: every character owns a progress bucket PER JOB (xp,
// enhancement picks, mastery). Job xp arrives from missions; every 100
// xp is one job level (cap 7). The job's `progression` declares what
// each level teaches: skills at levels 1/3/5 and enhancement picks at
// 2/4/6/7 — a pick raises one owned skill by one rank (max rank 3).
// The effective spec of a skill is its rank's catalog entry.
// ---------------------------------------------------------------------------

export const JOB_XP_PER_LEVEL = 100;
export const JOB_LEVEL_CAP = 7;

/** The character's progress bucket in the given job (its held job by
 *  default), created lazily on first touch. */
export function jobProgressOf(character: Character, jobId?: string): JobProgressState {
    const job = jobId ? undefined : heldJobOf(character);
    const id = jobId ?? job?.id ?? 'none';
    if (!character.jobProgress) character.jobProgress = {};
    let state = character.jobProgress[id];
    if (!state) {
        state = { xp: 0, skillLevels: {}, mastered: false, pendingPicks: 0 };
        character.jobProgress[id] = state;
    }
    return state;
}

/** The character's level in a job (its held job by default): 1..7. */
export function jobLevelOf(character: Character, jobId?: string): number {
    const state = jobProgressOf(character, jobId);
    return Math.min(JOB_LEVEL_CAP, Math.floor(state.xp / JOB_XP_PER_LEVEL) + 1);
}

/** The xp already earned inside the current job level (0..99). */
export function jobXpInLevelOf(character: Character, jobId?: string): number {
    return jobProgressOf(character, jobId).xp % JOB_XP_PER_LEVEL;
}

/**
 * Adds job xp to the character's HELD job (capped at level 7). Levels
 * crossed that grant enhancement picks queue them for the player's
 * choice; reaching the cap masters the job. Returns the levels gained
 * and the picks now waiting.
 */
export function grantJobXp(
    character: Character,
    amount: number,
): { levelsGained: number; pendingPicks: number } {
    const job = heldJobOf(character);
    if (!job) return { levelsGained: 0, pendingPicks: 0 };
    const state = jobProgressOf(character, job.id);
    const before = jobLevelOf(character, job.id);
    state.xp = Math.min(
        JOB_LEVEL_CAP * JOB_XP_PER_LEVEL,
        state.xp + Math.max(0, Math.round(amount)),
    );
    const after = jobLevelOf(character, job.id);
    let picks = 0;
    for (let level = before + 1; level <= after; level++) {
        if ((job.progression?.enhancementAt ?? []).indexOf(level) !== -1) picks += 1;
    }
    state.pendingPicks += picks;
    if (after >= JOB_LEVEL_CAP) state.mastered = true;
    return { levelsGained: after - before, pendingPicks: state.pendingPicks };
}

/** The rank plan of a skill in the job's ladder (undefined when the
 *  job does not teach the skill). */
function planOf(job: Job, skillId: string): JobSkillPlan | undefined {
    return job.progression?.skills.find((plan) => plan.skillId === skillId);
}

/** Every job the character has held (the current one included). */
export function heldJobsOf(character: Character): string[] {
    const held = character.heldJobs ? [...character.heldJobs] : [];
    const current = heldJobOf(character)?.id;
    if (current && held.indexOf(current) === -1) held.push(current);
    return held;
}

/** The skills the given job has taught the character so far (the held
 *  job by default): ladder skills unlocked at the character's job level
 *  in THAT job. */
export function ownedJobSkills(character: Character, jobId?: string): string[] {
    const job = jobId ? jobById(jobId) : heldJobOf(character);
    if (!job) return [];
    const level = jobLevelOf(character, job.id);
    const owned: string[] = [];
    for (const plan of job.progression?.skills ?? []) {
        if (plan.atJobLevel <= level && owned.indexOf(plan.skillId) === -1) {
            owned.push(plan.skillId);
        }
    }
    return owned;
}

/** The job feeding the second skill slot (undefined = empty slot). */
export function secondaryJobOf(character: Character): Job | undefined {
    return character.secondaryJobId ? jobById(character.secondaryJobId) : undefined;
}

/** The skills the second slot's job has taught the character. */
export function secondaryJobSkillsOf(character: Character): string[] {
    return character.secondaryJobId ? ownedJobSkills(character, character.secondaryJobId) : [];
}

/** The job that teaches the skill: the held job first, then the second
 *  slot's job. Undefined for own/tree/default skills. */
export function jobTeaching(character: Character, skillId: string): Job | undefined {
    const held = heldJobOf(character);
    if (held && planOf(held, skillId)) return held;
    const secondary = secondaryJobOf(character);
    if (secondary && planOf(secondary, skillId)) return secondary;
    return undefined;
}

/** The current level (1..3) of a job skill, stored per
 *  (character, job, skill) in the teaching job's bucket. */
export function skillRankOf(character: Character, skillId: string, jobId?: string): number {
    const state = jobProgressOf(
        character,
        jobId ?? jobTeaching(character, skillId)?.id ?? heldJobOf(character)?.id,
    );
    return state.skillLevels[skillId] ?? 1;
}

/**
 * Whether the character has the passive skill equipped/known in any of the
 * four places a passive can live: the held job's ladder, the second job's
 * ladder, passive slot 1 or passive slot 2. Job-ladder passives require
 * the job level that teaches them; passive slots are explicit.
 */
export function hasPassive(character: Character, skillId: string): boolean {
    for (const job of [heldJobOf(character), secondaryJobOf(character)]) {
        if (!job) continue;
        const plan = planOf(job, skillId);
        if (!plan) continue;
        const passive = plan.passive || definitionOf(skillId)?.passive;
        if (passive && plan.atJobLevel <= jobLevelOf(character, job.id)) return true;
    }
    return (character.passiveSlots ?? []).indexOf(skillId) !== -1;
}

/**
 * Resolves a skill id against the character's job progression: the spec of
 * the level the character currently has in its held job (level 1 for skills
 * the job does not teach). Own skills are always level 1.
 */
export function specForSkill(character: Character, skillId: string): SkillSpec | undefined {
    const definition = definitionOf(skillId);
    if (!definition) return specOf(skillId);
    const job = jobTeaching(character, skillId);
    if (!job) return resolveSkill(definition, 1);
    return resolveSkill(definition, skillRankOf(character, skillId, job.id));
}

export type EnhancementChoice = {
    skillId: string;
    currentRank: number;
    nextRank: number;
    currentSpec?: SkillSpec;
    nextSpec?: SkillSpec;
};

/** The owned skills the player may enhance right now (level < maxLevel). */
export function enhanceableSkillsOf(character: Character): EnhancementChoice[] {
    const job = heldJobOf(character);
    if (!job) return [];
    const level = jobLevelOf(character, job.id);
    const choices: EnhancementChoice[] = [];
    for (const plan of job.progression?.skills ?? []) {
        if (plan.atJobLevel > level) continue;
        const definition = definitionOf(plan.skillId);
        const maxLevel = plan.maxLevel ?? definition?.maxLevel ?? 3;
        const rank = skillRankOf(character, plan.skillId);
        if (rank >= maxLevel) continue;
        choices.push({
            skillId: plan.skillId,
            currentRank: rank,
            nextRank: rank + 1,
            currentSpec: definition ? resolveSkill(definition, rank) : specOf(plan.skillId, rank),
            nextSpec: definition ? resolveSkill(definition, rank + 1) : specOf(plan.skillId, rank + 1),
        });
    }
    return choices;
}

/** Spends one pending enhancement pick on the skill (must be owned and
 *  below rank 3). Returns whether the pick was applied. */
export function applyEnhancement(character: Character, skillId: string): boolean {
    const job = heldJobOf(character);
    const state = jobProgressOf(character, job?.id);
    if (state.pendingPicks <= 0) return false;
    const eligible = enhanceableSkillsOf(character).some((choice) => choice.skillId === skillId);
    if (!eligible) return false;
    state.skillLevels[skillId] = (state.skillLevels[skillId] ?? 1) + 1;
    state.pendingPicks -= 1;
    return true;
}

/** The enhancement picks waiting for the player's choice (held job). */
export function pendingJobPicks(character: Character): number {
    const job = heldJobOf(character);
    return job ? jobProgressOf(character, job.id).pendingPicks : 0;
}
