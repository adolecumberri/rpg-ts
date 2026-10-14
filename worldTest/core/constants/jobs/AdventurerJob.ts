import { Job } from '../../jobs/Job';
import { WEAPON_TYPES } from '../weaponTypes';

// The player's job: an adventurer that can wield anything. Its level-1
// identity (over the common base): +10 hp, +5 attack, +5 defence,
// +2 speed. Neutral growth: the default per-level gains.
export const ADVENTURER_JOB = new Job(
    'adventurer',
    'Adventurer',
    [],
    [WEAPON_TYPES.sword, WEAPON_TYPES.bow, WEAPON_TYPES.staff],
    { hp: 10, totalHp: 10, attack: 5, defence: 5, magicDefence: 0, speed: 2 },
    false,
);
