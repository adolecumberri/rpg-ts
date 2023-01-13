
/* Use_Case Status
durationType: "TEMPORAL"
            | "PERMANENT"
whenToApply: "ONCE"
            | "PER_ACTION"
appliedOn:  | "AFTER_ADD_STATUS"
            | "AFTER_ATTACK"
            | "AFTER_DEFENCE"
            | "AFTER_DIE"
            | "AFTER_REMOVE_STATUS"
            | "AFTER_TURN"
            | "BEFORE_ADD_STATUS"
            | "BEFORE_ATTACK"
            | "BEFORE_DEFENCE"
            | "BEFORE_DIE"
            | "BEFORE_REMOVE_STATUS"
            | "BEFORE_TURN";
*/

import Status from '../../classes/Status';
import {STATUS_APPLIED_ON, STATUS_DURATIONS, STATUS_WHEN_TO_APPLY} from '../status';

/**
 * tests:
 * TEMPORAL-
 *  ONCE-
 *      "AFTER_ADD_STATUS" 1_1_1
        | "AFTER_ATTACK" 1_1_2
        | "AFTER_DEFENCE" 1_1_3
        | "AFTER_DIE" 1_1_4
        | "AFTER_REMOVE_STATUS" 1_1_5
        | "AFTER_TURN" 1_1_6
        | "BEFORE_ADD_STATUS" 1_1_7
        | "BEFORE_ATTACK" 1_1_8
        | "BEFORE_DEFENCE" 1_1_9
        | "BEFORE_DIE" 1_1_10
        | "BEFORE_REMOVE_STATUS" 1_1_11
        | "BEFORE_TURN" 1_1_12
 *  PER_ACTION-
 *      "AFTER_ADD_STATUS" 1_2_1
        | "AFTER_ATTACK" 1_2_2
        | "AFTER_DEFENCE" 1_2_3
        | "AFTER_DIE" 1_2_4
        | "AFTER_REMOVE_STATUS" 1_2_5
        | "AFTER_TURN" 1_2_6
        | "BEFORE_ADD_STATUS" 1_2_7
        | "BEFORE_ATTACK" 1_2_8
        | "BEFORE_DEFENCE" 1_2_9
        | "BEFORE_DIE" 1_2_10
        | "BEFORE_REMOVE_STATUS" 1_2_11
        | "BEFORE_TURN" 1_2_12
 * PERMANENT-
 *  ONCE-
 *      "AFTER_ADD_STATUS" 2_1_1
        | "AFTER_ATTACK" 2_1_2
        | "AFTER_DEFENCE" 2_1_3
        | "AFTER_DIE" 2_1_4
        | "AFTER_REMOVE_STATUS" 2_1_5
        | "AFTER_TURN" 2_1_6
        | "BEFORE_ADD_STATUS" 2_1_7
        | "BEFORE_ATTACK" 2_1_8
        | "BEFORE_DEFENCE" 2_1_9
        | "BEFORE_DIE" 2_1_10
        | "BEFORE_REMOVE_STATUS" 2_1_11
        | "BEFORE_TURN" 2_1_12
 *  PER_ACTION-
 *      "AFTER_ADD_STATUS" 2_2_1
        | "AFTER_ATTACK" 2_2_2
        | "AFTER_DEFENCE" 2_2_3
        | "AFTER_DIE" 2_2_4
        | "AFTER_REMOVE_STATUS" 2_2_5
        | "AFTER_TURN" 2_2_6
        | "BEFORE_ADD_STATUS" 2_2_7
        | "BEFORE_ATTACK" 2_2_8
        | "BEFORE_DEFENCE" 2_2_9
        | "BEFORE_DIE" 2_2_10
        | "BEFORE_REMOVE_STATUS" 2_2_11
        | "BEFORE_TURN" 2_2_12
 */

/* TEMPORAL ONCE*/
const test_1_1_1 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.AFTER_ADD_STATUS,
});
const test_1_1_2 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.AFTER_ATTACK,
});
const test_1_1_3 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.AFTER_DEFENCE,
});
const test_1_1_4 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.AFTER_DIE,
});
const test_1_1_5 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.AFTER_REMOVE_STATUS,
});
const test_1_1_6 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.AFTER_TURN,
});
const test_1_1_7 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.BEFORE_ADD_STATUS,
});
const test_1_1_8 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.BEFORE_ATTACK,
});
const test_1_1_9 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.BEFORE_DEFENCE,
});
const test_1_1_10 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.BEFORE_DIE,
});
const test_1_1_11 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.BEFORE_REMOVE_STATUS,
});
const test_1_1_12 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.BEFORE_TURN,
});


/* TEMPORAL PER_ACTION */
const test_1_2_1 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.AFTER_ADD_STATUS,
});
const test_1_2_2 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.AFTER_ATTACK,
});
const test_1_2_3 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.AFTER_DEFENCE,
});
const test_1_2_4 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.AFTER_DIE,
});
const test_1_2_5 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.AFTER_REMOVE_STATUS,
});
const test_1_2_6 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.AFTER_TURN,
});
const test_1_2_7 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.BEFORE_ADD_STATUS,
});
const test_1_2_8 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.BEFORE_ATTACK,
});
const test_1_2_9 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.BEFORE_DEFENCE,
});
const test_1_2_10 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.BEFORE_DIE,
});
const test_1_2_11 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.BEFORE_REMOVE_STATUS,
});
const test_1_2_12 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.TEMPORAL,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.BEFORE_TURN,
});

/* PERMANENT ONCE*/
const test_2_1_1 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.AFTER_ADD_STATUS,
});
const test_2_1_2 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.AFTER_ATTACK,
});
const test_2_1_3 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.AFTER_DEFENCE,
});
const test_2_1_4 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.AFTER_DIE,
});
const test_2_1_5 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.AFTER_REMOVE_STATUS,
});
const test_2_1_6 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.AFTER_TURN,
});
const test_2_1_7 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.BEFORE_ADD_STATUS,
});
const test_2_1_8 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.BEFORE_ATTACK,
});
const test_2_1_9 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.BEFORE_DEFENCE,
});
const test_2_1_10 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.BEFORE_DIE,
});
const test_2_1_11 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.BEFORE_REMOVE_STATUS,
});
const test_2_1_12 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.ONCE,
  appliedOn: STATUS_APPLIED_ON.BEFORE_TURN,
});


/* PERMANENT PER_ACTION */
const test_2_2_1 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.AFTER_ADD_STATUS,
});
const test_2_2_2 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.AFTER_ATTACK,
});
const test_2_2_3 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.AFTER_DEFENCE,
});
const test_2_2_4 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.AFTER_DIE,
});
const test_2_2_5 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.AFTER_REMOVE_STATUS,
});
const test_2_2_6 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.AFTER_TURN,
});
const test_2_2_7 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.BEFORE_ADD_STATUS,
});
const test_2_2_8 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.BEFORE_ATTACK,
});
const test_2_2_9 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.BEFORE_DEFENCE,
});
const test_2_2_10 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.BEFORE_DIE,
});
const test_2_2_11 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.BEFORE_REMOVE_STATUS,
});
const test_2_2_12 = new Status({
  statsAffected: [],
  duration: {
    type: STATUS_DURATIONS.PERMANENT,
  },
  whenToApply: STATUS_WHEN_TO_APPLY.PER_ACTION,
  appliedOn: STATUS_APPLIED_ON.BEFORE_TURN,
});

export {
  test_1_1_1,
  test_1_1_2,
  test_1_1_3,
  test_1_1_4,
  test_1_1_5,
  test_1_1_6,
  test_1_1_7,
  test_1_1_8,
  test_1_1_9,
  test_1_1_10,
  test_1_1_11,
  test_1_1_12,
  test_1_2_1,
  test_1_2_2,
  test_1_2_3,
  test_1_2_4,
  test_1_2_5,
  test_1_2_6,
  test_1_2_7,
  test_1_2_8,
  test_1_2_9,
  test_1_2_10,
  test_1_2_11,
  test_1_2_12,
  test_2_1_1,
  test_2_1_2,
  test_2_1_3,
  test_2_1_4,
  test_2_1_5,
  test_2_1_6,
  test_2_1_7,
  test_2_1_8,
  test_2_1_9,
  test_2_1_10,
  test_2_1_11,
  test_2_1_12,
  test_2_2_1,
  test_2_2_2,
  test_2_2_3,
  test_2_2_4,
  test_2_2_5,
  test_2_2_6,
  test_2_2_7,
  test_2_2_8,
  test_2_2_9,
  test_2_2_10,
  test_2_2_11,
  test_2_2_12,
};
