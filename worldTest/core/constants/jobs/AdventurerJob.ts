import { Job } from '../../jobs/Job';

// The player's job: an adventurer that can wield anything.
export const ADVENTURER_JOB = new Job(
    'adventurer',
    'Adventurer',
    [],
    ['sword', 'bow', 'staff'],
);
