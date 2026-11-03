import type { Character } from '../../../src';
import type { Job, JobRequirement } from './Job';
import { ORDER_JOB_LADDER } from './Job';
import { heldJobsOf, jobLevelOf, jobProgressOf } from './progression';

// ---------------------------------------------------------------------------
// Job unlocks. Two scopes:
//   - World knowledge: the job only appears in the Oficio once the flag
//     its `knownBy` names is set (a mission reveals it).
//   - Character progress: the requirements are checked against the
//     character being viewed (levels/masteries of other jobs). Taking a
//     job the character already holds is always allowed.
// The check is player-facing only: content can create characters with
// any job regardless of these requirements.
// ---------------------------------------------------------------------------

export type JobUnlockState = {
    // The player knows the job exists (no knownBy = always known).
    visible: boolean;
    // The viewed character may take the job right now.
    ok: boolean;
    // The human line describing what the job asks for.
    requirementText: string;
    // Why it cannot be taken (empty when ok).
    reason: string;
};

/** The display text of one requirement ('Soldier Lv.5', 'Master Soldier'...). */
function requirementTextOf(
    requirement: JobRequirement,
    jobTitleOf: (jobId: string) => string,
): string {
    switch (requirement.kind) {
        case 'jobLevel':
            return `${jobTitleOf(requirement.jobId)} Lv.${requirement.level}`;
        case 'jobMastered':
            return `Master ${jobTitleOf(requirement.jobId)}`;
        case 'orderLadder': {
            const ladder = ORDER_JOB_LADDER
                .map((levels) => levels.map((level) => `Lv.${level}`).join(' + '))
                .join(', then ');
            return `${ladder} in any job`;
        }
        default:
            return '';
    }
}

/** Whether the character may take the job, and why not when it cannot. */
export function jobUnlockState(
    character: Character,
    job: Job,
    isFlagSet: (flag: string) => boolean,
    jobTitleOf: (jobId: string) => string = (jobId) => jobId,
): JobUnlockState {
    const visible = !job.unlock?.knownBy || isFlagSet(job.unlock.knownBy);
    const held = heldJobsOf(character);
    const alreadyHeld = held.indexOf(job.id) !== -1;
    const requirements = job.unlock?.requirements ?? [];
    if (alreadyHeld || requirements.length === 0) {
        return {
            visible,
            ok: true,
            requirementText: alreadyHeld ? 'Already held' : 'No requirement',
            reason: '',
        };
    }

    const requirementText = (() => {
        const ladder = requirements.some((requirement) => requirement.kind === 'orderLadder');
        if (ladder) {
            const need = ORDER_JOB_LADDER[held.length - 1];
            if (need) return `${need.map((level) => `Lv.${level}`).join(' + ')} in any job`;
        }
        return requirements
            .map((requirement) => requirementTextOf(requirement, jobTitleOf))
            .join(' + ');
    })();
    const levels = held.map((id) => jobLevelOf(character, id)).sort((a, b) => b - a);

    for (const requirement of requirements) {
        if (requirement.kind === 'jobLevel' &&
            jobLevelOf(character, requirement.jobId) < requirement.level) {
            return {
                visible,
                ok: false,
                requirementText,
                reason: `Requires ${requirementTextOf(requirement, jobTitleOf)}.`,
            };
        }
        if (requirement.kind === 'jobMastered' &&
            !jobProgressOf(character, requirement.jobId).mastered) {
            return {
                visible,
                ok: false,
                requirementText,
                reason: `Requires ${requirementTextOf(requirement, jobTitleOf)}.`,
            };
        }
        if (requirement.kind === 'orderLadder') {
            const need = ORDER_JOB_LADDER[held.length - 1];
            if (need && !need.every((level, index) => (levels[index] ?? 0) >= level)) {
                return {
                    visible,
                    ok: false,
                    requirementText,
                    reason: `Requires ${requirementText}.`,
                };
            }
        }
    }

    return { visible, ok: true, requirementText, reason: '' };
}
