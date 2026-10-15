import type { Character } from '../../../src';
import type { SkillSpec } from '../skills';
import { specOf } from '../skills';
import { heldJobOf } from '../constants/jobs';
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
        state = { xp: 0, enhancements: [], mastered: false, pendingPicks: 0 };
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

/** The skills the character's held job has taught it so far (the base
 *  kit plus the level-3 and level-5 unlocks). */
export function ownedJobSkills(character: Character): string[] {
    const job = heldJobOf(character);
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

/** The current rank (1..3) of one of the character's job skills: 1
 *  plus the enhancement picks spent on it. */
export function skillRankOf(character: Character, skillId: string): number {
    const state = jobProgressOf(character, heldJobOf(character)?.id);
    const picks = state.enhancements.filter((id) => id === skillId).length;
    return 1 + picks;
}

/**
 * Resolves a skill id against the character's job progression: the
 * rank spec the character currently uses (rank 1 = the base). Skills
 * outside the job's ladder resolve to their plain spec.
 */
export function specForSkill(character: Character, skillId: string): SkillSpec | undefined {
    const job = heldJobOf(character);
    const plan = job ? planOf(job, skillId) : undefined;
    if (!plan || plan.ranks.length === 0) return specOf(skillId);
    const rank = Math.min(plan.ranks.length, skillRankOf(character, skillId));
    return specOf(plan.ranks[rank - 1]) ?? specOf(skillId);
}

export type EnhancementChoice = {
    skillId: string;
    currentRank: number;
    nextRank: number;
    currentSpec?: SkillSpec;
    nextSpec?: SkillSpec;
};

/** The owned skills the player may enhance right now (rank < 3). */
export function enhanceableSkillsOf(character: Character): EnhancementChoice[] {
    const job = heldJobOf(character);
    if (!job) return [];
    const level = jobLevelOf(character, job.id);
    const choices: EnhancementChoice[] = [];
    for (const plan of job.progression?.skills ?? []) {
        if (plan.atJobLevel > level) continue;
        const rank = skillRankOf(character, plan.skillId);
        if (rank >= plan.ranks.length) continue;
        choices.push({
            skillId: plan.skillId,
            currentRank: rank,
            nextRank: rank + 1,
            currentSpec: specOf(plan.ranks[rank - 1]),
            nextSpec: specOf(plan.ranks[rank]),
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
    state.enhancements.push(skillId);
    state.pendingPicks -= 1;
    return true;
}

/** The enhancement picks waiting for the player's choice (held job). */
export function pendingJobPicks(character: Character): number {
    const job = heldJobOf(character);
    return job ? jobProgressOf(character, job.id).pendingPicks : 0;
}
