import { Job } from '../../jobs/Job';
import { WEAPON_TYPES } from '../weaponTypes';

// The Order healer (mage): dispels and cures with the mage staff.
// Scholarly but frail: +5 magic, -1 defence.
export const HEALER_JOB = new Job(
    'healer',
    'Healer',
    ['dispel', 'cure'],
    [WEAPON_TYPES.staff],
    { magic: 5, defence: -1 },
    false,
    {
        base: { hp: 92, totalHp: 92, attack: 2, defence: 0, magicDefence: 0, speed: 6 },
        // Healers scale magic and magic defence; their physical growth
        // stays weak.
        ratios: { hp: 0.8, totalHp: 0.8, attack: 0.6, defence: 0.7, magicDefence: 1.2, magic: 1.3, speed: 1 },
    },
);
