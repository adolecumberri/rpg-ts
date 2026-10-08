import { Job } from '../../jobs/Job';
import { WEAPON_TYPES } from '../weaponTypes';

// The player's job: an adventurer that can wield anything.
export const ADVENTURER_JOB = new Job(
    'adventurer',
    'Adventurer',
    [],
    [WEAPON_TYPES.sword, WEAPON_TYPES.bow, WEAPON_TYPES.staff],
    {},
    false,
    {
        base: { hp: 100, totalHp: 100, attack: 5, defence: 1, magicDefence: 0, speed: 6 },
        // Neutral growth: the default per-level gains.
    },
);
