import Status from "../../classes/Status";
import { IStatAffected } from "../../interfaces/Status.Interface";

let hpChange: IStatAffected = {
    from: "total_hp",
    to: "hp",
    value: 20,
    type: "DEBUFF_PERCENTAGE",
    timesUsed: 0
};
let attackBoost: IStatAffected = {
    from: "attack",
    to: "attack",
    value: 10,
    type: "BUFF_FIXED",
    recovers: true,
    timesUsed: 0
};
let defenceDebuff: IStatAffected = {
    from: "defence",
    to: "defence",
    value: 10,
    type: "DEBUFF_PERCENTAGE",
    recovers: true,
    timesUsed: 0,
};

let hardDefenceDebuff: IStatAffected = {
    from: "defence",
    to: "defence",
    value: 20,
    type: "DEBUFF_PERCENTAGE",
    recovers: true,
    timesUsed: 0,
};

let accuracyCurse: IStatAffected = {
    from: "accuracy",
    to: "accuracy",
    value: 50,
    type: "DEBUFF_FIXED",
    recovers: false,
    timesUsed: 0
};
let notOriginalDoubleTeam: IStatAffected = {
    from: "evasion",
    to: "evasion",
    value: 10,
    type: "BUFF_PERCENTAGE",
    recovers: false,
    source: "stats",
    timesUsed: 0
};
let doubleTeam: IStatAffected = {
    from: "evasion",
    to: "evasion",
    value: 10,
    type: "BUFF_PERCENTAGE",
    recovers: false,
    source: "originalStats",
    timesUsed: 0
};
let poison = new Status({
    statsAffected: [hpChange],
    appliedOn: "AFTER_TURN",
    whenToApply: "PER_ACTION",
    duration: {
        type: "TEMPORAL",
        value: 3
    },
    name: "poison",
});
let attBuff = new Status({
    statsAffected: [attackBoost],
    appliedOn: "BEFORE_TURN",
    whenToApply: "ONCE",
    duration: {
        type: "PERMANENT"
    },
    name: "attack Buff",
});
let breakDefence = new Status({
    statsAffected: [defenceDebuff],
    appliedOn: "BEFORE_TURN",
    whenToApply: "ONCE",
    duration: {
        type: "PERMANENT"
    },
    name: "deffence break",
});
let blindCurse = new Status({
    statsAffected: [accuracyCurse],
    appliedOn: "BEFORE_TURN",
    whenToApply: "ONCE",
    duration: {
        type: "TEMPORAL"
    }, name: "blind Curse",
});
let frozen = new Status({
    statsAffected: [{
        from: 'accuracy',
        to: 'accuracy',
        type: "DEBUFF_FIXED",
        value: 100,
        recovers: true,
        timesUsed: 0
    }],
    appliedOn: 'BEFORE_ATTACK',
    duration: {
        type: "TEMPORAL",
        value: 3
    },
    whenToApply: 'PER_ACTION'
})

let test1 = new Status({
    statsAffected: [attackBoost],
    appliedOn: "BEFORE_TURN",
    whenToApply: "ONCE",
    duration: {
        type: "TEMPORAL",
        value: 1
    },
    name: "attack Buff",
});

let test2 = new Status({
    statsAffected: [attackBoost],
    appliedOn: "BEFORE_TURN",
    whenToApply: "ONCE",
    duration: {
        type: "PERMANENT"
    },
    name: "attack Buff",
});

//+10 def todos las activaciones
let test3 = new Status({
    statsAffected: [defenceDebuff],
    appliedOn: "BEFORE_TURN",
    whenToApply: "PER_ACTION",
    duration: {
        type: "PERMANENT"
    },
    name: "attack Buff",
});

export {
    poison,
    attBuff,
    breakDefence,
    blindCurse,
    doubleTeam,
    notOriginalDoubleTeam,
    hpChange,
    frozen,
    test1,
    test2,
    test3,
    defenceDebuff,
    attackBoost,
    hardDefenceDebuff
};
