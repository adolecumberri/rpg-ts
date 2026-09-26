import { Job } from '../../jobs/Job';

// The Order healer (mage): dispels and cures with the mage staff.
// Scholarly but frail: +5 magic, -1 defence.
export const HEALER_JOB = new Job(
    'healer',
    'Healer',
    ['dispel', 'cure'],
    ['staff'],
    { magic: 5, defence: -1 },
);
