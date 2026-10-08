import { Job } from '../../jobs/Job';
import { WEAPON_TYPES } from '../weaponTypes';

// The Order archer: harasses from every row with the bow. Trained
// reflexes: +2 attack and +2 speed.
export const ARCHER_JOB = new Job(
    'archer',
    'Archer',
    ['fast_draw', 'weak_point'],
    [WEAPON_TYPES.bow],
    { attack: 2, speed: 2 },
    false,
    {
        base: { hp: 92, totalHp: 92, attack: 5, defence: 0, magicDefence: 0, speed: 8 },
        // Archers scale speed and crits, but gain little bulk.
        ratios: { hp: 0.8, totalHp: 0.8, attack: 1.1, defence: 0.6, magicDefence: 0.6, magic: 0.6, speed: 1.2, critChance: 1.2 },
    },
);
