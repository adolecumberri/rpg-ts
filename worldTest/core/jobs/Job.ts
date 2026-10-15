// ---------------------------------------------------------------------------
// The Job: the generic core class that owns a character's identity as a
// fighter — its title, the skills it knows, the weapon types it may
// wield, the stat bonuses it applies while held and its growth profile.
// Concrete jobs are defined as constants (one file per job).
// ---------------------------------------------------------------------------

import type { GrowthProfile } from '../config/growth';
import type { SkillId } from '../skills';

// The weapon triangle for now; armors and other slots will join later.
export type WeaponType = 'sword' | 'bow' | 'staff';

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

// One skill the job teaches: learned at a job level, with its rank
// ladder — 1 to 3 normal catalog specs (base, enhanced, mastered).
export type JobSkillPlan = {
    skillId: SkillId;
    atJobLevel: number;
    ranks: SkillId[];
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
    // The player's enhancement picks (base skill ids; each entry = +1
    // rank, max rank 3).
    enhancements: string[];
    // Reached job level 7.
    mastered: boolean;
    // Enhancement picks waiting for the player's choice.
    pendingPicks: number;
};

export class Job {
    constructor(
        readonly id: string,
        readonly title: string,
        readonly skillIds: SkillId[],
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
        // The job's progression ladder: the skills it teaches (with
        // their rank specs), the enhancement levels and the mastery
        // title. Undefined = no ladder (the Adventurer).
        readonly progression?: JobProgression,
    ) { }

    /** Whether the job may wield a weapon of the given type. Untyped
     *  items (bags, outfits...) are always allowed. */
    allowsWeapon(weaponType: WeaponType | undefined): boolean {
        if (!weaponType) return true;
        return this.weaponTypes.indexOf(weaponType) !== -1;
    }
}
