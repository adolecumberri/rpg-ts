import { Job } from '../../jobs/Job';
import { WEAPON_TYPES } from '../weaponTypes';

// The Order archer: harasses from every row with the bow. The job's
// level-1 identity (over the common base): +26 hp, +7 attack,
// +9 defence, +9 magic defence, +9 speed, +10 crit.
export const ARCHER_JOB = new Job(
    'archer',
    'Archer',
    ['foot_shot', 'concentration'],
    [WEAPON_TYPES.bow],
    { hp: 26, totalHp: 26, attack: 7, defence: 9, magicDefence: 9, speed: 9, critChance: 10 },
    false,
    { attack: 1.4, defence: 0.8, magicDefence: 1, magic: 0.8, speed: 1.6, critChance: 1.4 },
);
