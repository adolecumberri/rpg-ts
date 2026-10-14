import { Job } from '../../jobs/Job';
import { WEAPON_TYPES } from '../weaponTypes';

// The Order soldier: leads the charge with the sword. The job's level-1
// identity (over the common base): +30 hp, +9 attack, +10 defence,
// +4 magic defence, +2 speed. Trained with the shield.
export const SOLDIER_JOB = new Job(
    'soldier',
    'Soldier',
    ['disarm', 'stand'],
    [WEAPON_TYPES.sword],
    { hp: 30, totalHp: 30, attack: 9, defence: 10, magicDefence: 4, speed: 2 },
    true,
    { hp: 1.6, totalHp: 1.6, attack: 1.3, defence: 1.3, magicDefence: 0.9, magic: 0.7, speed: 1.2 },
);
