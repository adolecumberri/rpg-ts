import { Job } from '../../jobs/Job';

// The Order soldier: leads the charge with the sword. Drill and armor:
// +3 attack and +2 defence.
export const SOLDIER_JOB = new Job(
    'soldier',
    'Soldier',
    ['impetu', 'first_aid'],
    ['sword'],
    { attack: 3, defence: 2 },
);
