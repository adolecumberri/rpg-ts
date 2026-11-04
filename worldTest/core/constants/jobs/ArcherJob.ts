import { Job } from '../../jobs/Job';
import { WEAPON_TYPES } from '../weaponTypes';

// The Order archer: harasses from every row with the bow. The job's
// level-1 identity (over the common base): +26 hp, +7 attack,
// +9 defence, +9 magic defence, +9 speed, +10 crit.
export const ARCHER_JOB = new Job(
    'archer',
    'Archer',
    [WEAPON_TYPES.bow, WEAPON_TYPES.knife],
    { hp: 26, totalHp: 26, attack: 7, defence: 9, magicDefence: 9, speed: 9, critChance: 10 },
    false,
    { attack: 1.4, defence: 0.8, magicDefence: 1, magic: 0.8, speed: 1.6, critChance: 1.4 },
    {
        skills: [
            { skillId: 'foot_shot', atJobLevel: 1 },
            { skillId: 'concentration', atJobLevel: 1 },
            { skillId: 'nature_salve', atJobLevel: 3 },
            { skillId: 'focus_the_eyes', atJobLevel: 5 },
        ],
        enhancementAt: [2, 4, 6, 7],
        masteryTitle: 'Master Archer',
    },
    {
        // The base trio share the same requirement ladder, evaluated
        // against the character being viewed (ORDER_JOB_LADDER).
        requirements: [{ kind: 'orderLadder' }],
    },
    'back',
);
