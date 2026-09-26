import { Job } from '../../jobs/Job';

// The Order archer: harasses from every row with the bow. Trained
// reflexes: +2 attack and +2 speed.
export const ARCHER_JOB = new Job(
    'archer',
    'Archer',
    ['fast_draw', 'weak_point'],
    ['bow'],
    { attack: 2, speed: 2 },
);
