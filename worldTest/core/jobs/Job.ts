// ---------------------------------------------------------------------------
// The Job: the generic core class that owns a character's identity as a
// fighter — its title, the skills it knows, the weapon types it may
// wield, the stat bonuses it applies while held and its growth profile.
// Concrete jobs are defined as constants (one file per job).
// ---------------------------------------------------------------------------

import type { GrowthProfile } from '../config/growth';

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
    | 'magic';

export type JobStatBonuses = Partial<Record<JobStatKey, number>>;

export class Job {
    constructor(
        readonly id: string,
        readonly title: string,
        readonly skillIds: string[],
        readonly weaponTypes: WeaponType[],
        // Stat modifiers applied to the bearer while the job is held
        // (added on assignment, removed on swap). Plain numbers, not
        // statuses: they live directly on the character stats.
        readonly statBonuses: JobStatBonuses = {},
        // Whether the job may carry a shield in the offhand.
        readonly canShield: boolean = false,
        // The job's growth profile (level-1 bases + optional max/rate).
        // Without one, the default growth applies (60% of the generic
        // maximums).
        readonly growth?: GrowthProfile,
    ) {}

    /** Whether the job may wield a weapon of the given type. Untyped
     *  items (bags, outfits...) are always allowed. */
    allowsWeapon(weaponType: WeaponType | undefined): boolean {
        if (!weaponType) return true;
        return this.weaponTypes.indexOf(weaponType) !== -1;
    }
}
