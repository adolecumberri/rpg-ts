import { ARCHER_JOB, HEALER_JOB, SOLDIER_JOB } from '../constants/jobs';

// Fixed values of Act 1: the Order camp. The player starts at the camp
// as a fresh recruit; the branch choice decides their class.

export const ACT1 = {
    startPlaceId: 'camp',
    // The Order Army recruits: their class stats and kits come from the
    // job constants.
    recruits: {
        archer: ARCHER_JOB,
        healer: HEALER_JOB,
        soldier: SOLDIER_JOB,
    },
    // The camp roster composition: the class counts are CONSTANT —
    // every camp roster always holds exactly these numbers (the
    // fourteen recruits: archers + healers + soldiers; Arturo counts
    // as one of the healers). The world builds the recruits from here,
    // never from ad-hoc arrays.
    roster: {
        archers: 4,
        healers: 2,
        soldiers: 8,
    },
} as const;
