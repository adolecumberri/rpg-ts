import { Job } from '../../jobs/Job';
import { WEAPON_TYPES } from '../weaponTypes';
import { FLAGS } from '../flags';

// The Pirate: a knife fighter that disrupts enemy gear and sails with a
// crew. First pass: four skills, none enhancable yet (maxLevel 1), no
// growth values. The job exists only after its discovery mission flag.
export const PIRATE_JOB = new Job(
    'pirate',
    'Pirate',
    [WEAPON_TYPES.knife],
    { hp: 22, totalHp: 22, attack: 8, defence: 5, speed: 5 },
    false,
    { attack: 1.2, defence: 0.9, speed: 1.3, hp: 1.2, totalHp: 1.2 },
    {
        skills: [
            { skillId: 'knife_mastery', atJobLevel: 1, maxLevel: 1 },
            { skillId: 'disarm_weapon', atJobLevel: 1, maxLevel: 1 },
            { skillId: 'escorbuto', atJobLevel: 3, maxLevel: 1 },
            { skillId: 'crew', atJobLevel: 5, maxLevel: 1 },
        ],
        enhancementAt: [2, 4, 6, 7],
        masteryTitle: 'Master Pirate',
    },
    {
        // Revealed by the pirate discovery mission; requirements to be
        // decided with the mission content.
        knownBy: FLAGS.PIRATE_KNOWN,
    },
);
