// ---------------------------------------------------------------------------
// The Job: the generic core class that owns a character's identity as a
// fighter — its title, the skills it knows, the weapon types it may
// wield, the stat bonuses it applies while held and its growth profile.
// Concrete jobs are defined as constants (one file per job).
// ---------------------------------------------------------------------------

import type { GrowthProfile } from '../config/growth';
import type { SkillId } from '../skills';

// The weapon triangle for now; knives join for the Pirate.
export type WeaponType = 'sword' | 'bow' | 'staff' | 'knife';

// The job's visual formation row in battle. It no longer has gameplay
// effects: reach/rows were removed, the position only decides where the
// card sits on the battlefield.
export type JobPosition = 'front' | 'center' | 'back';

// The numeric stats a job may raise or lower: the library stats plus
// the worldTest ones. rangeOf stays out: it is a string stat.
export type JobStatKey =
    | 'attack'
    | 'defence'
    | 'magicDefence'
    | 'critChance'
    | 'critMultiplier'
    | 'speed'
    | 'magic'
    | 'hp'
    | 'totalHp';

export type JobStatBonuses = Partial<Record<JobStatKey, number>>;

// One skill the job teaches: unlocked at a job level, levelled from 1 to
// its own maxLevel by the job's enhancement picks (maxLevel 1 = the skill
// cannot be enhanced; passives are always on and never castable).
export type JobSkillPlan = {
    skillId: SkillId;
    atJobLevel: number;
    maxLevel?: number;
    passive?: boolean;
};

// The job's progression ladder: what each job level teaches or grants.
export type JobProgression = {
    // The skills the job teaches, in learning order.
    skills: JobSkillPlan[];
    // The job levels that grant one enhancement PICK (the player
    // chooses which owned skill goes up one rank).
    enhancementAt: number[];
    // The level-7 title (the mastered star on the job list).
    masteryTitle: string;
};

// One character's progress in ONE job (each job keeps its own bucket:
// a character can hold all the jobs, each with its own xp and picks).
export type JobProgressState = {
    // Total job xp: 100 per level, 7 levels max.
    xp: number;
    // The level of each of the job's skills the character has raised (base id
    // -> 1..3; a missing id means level 1). Levels are per (character, job,
    // skill): the same skill can be level 3 in one job and level 1 in another.
    skillLevels: Record<string, number>;
    // Reached job level 7.
    mastered: boolean;
    // Enhancement picks waiting for the player's choice.
    pendingPicks: number;
};

// One requirement a character must meet to TAKE a job it has never held.
export type JobRequirement =
    // A specific held job must have reached this level.
    | { kind: 'jobLevel'; jobId: string; level: number }
    // A specific held job must be mastered (Lv.7).
    | { kind: 'jobMastered'; jobId: string }
    // The base trio's shared ladder: the character's held jobs must have
    // the levels ORDER_JOB_LADDER asks for their current job count.
    | { kind: 'orderLadder' };

// What a job needs to become available: the world flag a mission sets
// (unknown jobs stay hidden from the Oficio) and the character's own
// progress requirements.
export type JobUnlock = {
    // The global flag that reveals the job exists.
    knownBy?: string;
    // What the character must have done to take the job.
    requirements?: JobRequirement[];
};

// The base trio's ladder (Soldier, Archer and Mage share these
// constants): index = jobs already held before taking the new one.
export const ORDER_JOB_LADDER: number[][] = [
    [3],      // taking job #2: one held job at Lv.3
    [5, 3],   // taking job #3: held jobs at Lv.5 and Lv.3
];

export class Job {
    constructor(
        readonly id: string,
        readonly title: string,
        readonly weaponTypes: WeaponType[],
        // Stat modifiers applied to the bearer while the job is held
        // (added on assignment, removed on swap). Plain numbers, not
        // statuses: they live directly on the character stats. These
        // ARE the job's level-1 identity — its base values layered on
        // top of the common DEFAULT_BASE (the soldier's +30 hp...).
        readonly statBonuses: JobStatBonuses = {},
        // Whether the job may carry a shield in the offhand.
        readonly canShield: boolean = false,
        // The job's per-stat growth ratios (1 = the default gains;
        // missing stats use 1). The base values live in statBonuses.
        readonly growth?: GrowthProfile,
        // The job's progression ladder: the skills it teaches (each with
        // its learning level, cap and passive flag), the enhancement levels
        // and the mastery title. Undefined = no ladder (the Adventurer).
        readonly progression?: JobProgression,
        // What the player must know and the character must have done to
        // TAKE this job. Undefined = always available (no discovery).
        readonly unlock?: JobUnlock,
        // The visual battle row of the job (front/center/back). Purely
        // cosmetic: it places the battlefield card and nothing else.
        readonly position: JobPosition = 'front',
    ) { }

    /** Whether the job may wield a weapon of the given type. Untyped
     *  items (bags, outfits...) are always allowed. */
    allowsWeapon(weaponType: WeaponType | undefined): boolean {
        if (!weaponType) return true;
        return this.weaponTypes.indexOf(weaponType) !== -1;
    }
}
