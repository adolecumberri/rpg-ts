import { Job } from '../../jobs/Job';
import { WEAPON_TYPES } from '../weaponTypes';

// The Order soldier: leads the charge with the sword. Drill and armor:
// +3 attack and +2 defence. Trained with the shield.
export const SOLDIER_JOB = new Job(
    'soldier',
    'Soldier',
    ['impetu', 'first_aid'],
    [WEAPON_TYPES.sword],
    { attack: 3, defence: 2 },
    true,
    {
        base: { hp: 100, totalHp: 100, attack: 6, defence: 3, magicDefence: 0, speed: 5 },
        // Soldiers gain more life and attack per level, but scale
        // magic and magic power less.
        ratios: { hp: 1.2, totalHp: 1.2, attack: 1.2, defence: 1, magicDefence: 0.7, magic: 0.5, speed: 0.9 },
    },
);
