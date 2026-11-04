import { Job } from '../../jobs/Job';
import { WEAPON_TYPES } from '../weaponTypes';

// The Order healer (mage): dispels and cures with the mage staff. The
// job's level-1 identity (over the common base): +18 hp, +4 defence,
// +30 magic, +20 magic defence.
export const HEALER_JOB = new Job(
    'healer',
    'Healer',
    [WEAPON_TYPES.staff],
    { hp: 18, totalHp: 18, defence: 4, magic: 30, magicDefence: 20, taunt: 1 },
    false,
    { hp: 1, totalHp: 1, attack: 0.7, defence: 0.7, magicDefence: 1.6, magic: 2, speed: 1 },
    {
        skills: [
            { skillId: 'perno_magico', atJobLevel: 1 },
            { skillId: 'healing_whispers', atJobLevel: 1 },
            { skillId: 'astra', atJobLevel: 3 },
            { skillId: 'double_strike', atJobLevel: 5 },
        ],
        enhancementAt: [2, 4, 6, 7],
        masteryTitle: 'Master Healer',
    },
    {
        // The base trio share the same requirement ladder, evaluated
        // against the character being viewed (ORDER_JOB_LADDER).
        requirements: [{ kind: 'orderLadder' }],
    },
    'center',
);
