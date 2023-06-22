import Status from '../../classes/Status';
import {IStatAffected} from '../../interfaces/Status.Interface';

const hpChange: IStatAffected = {
  from: 'total_hp',
  to: 'hp',
  value: 20,
  type: 'DEBUFF_PERCENTAGE',
  timesUsed: 0,
};
const attackBoost: IStatAffected = {
  from: 'attack',
  to: 'attack',
  value: 10,
  type: 'BUFF_FIXED',
  recovers: true,
  timesUsed: 0,
};
const defenceDebuff: IStatAffected = {
  from: 'defence',
  to: 'defence',
  value: 10,
  type: 'DEBUFF_PERCENTAGE',
  recovers: true,
  timesUsed: 0,
};

const hardDefenceDebuff: IStatAffected = {
  from: 'defence',
  to: 'defence',
  value: 20,
  type: 'DEBUFF_PERCENTAGE',
  recovers: true,
  timesUsed: 0,
};

const accuracyCurse: IStatAffected = {
  from: 'accuracy',
  to: 'accuracy',
  value: 50,
  type: 'DEBUFF_FIXED',
  recovers: false,
  timesUsed: 0,
};
const notOriginalDoubleTeam: IStatAffected = {
  from: 'evasion',
  to: 'evasion',
  value: 10,
  type: 'BUFF_PERCENTAGE',
  recovers: false,
  source: 'stats',
  timesUsed: 0,
};
const doubleTeam: IStatAffected = {
  from: 'evasion',
  to: 'evasion',
  value: 10,
  type: 'BUFF_PERCENTAGE',
  recovers: false,
  source: 'originalStats',
  timesUsed: 0,
};
const poison = new Status({
  statsAffected: [hpChange],
  appliedOn: 'AFTER_TURN',
  whenToApply: 'PER_ACTION',
  duration: {
    type: 'TEMPORAL',
    value: 3,
  },
  name: 'poison',
});
const attBuff = new Status({
  statsAffected: [attackBoost],
  appliedOn: 'BEFORE_TURN',
  whenToApply: 'ONCE',
  duration: {
    type: 'PERMANENT',
  },
  name: 'attack Buff',
});
const breakDefence = new Status({
  statsAffected: [defenceDebuff],
  appliedOn: 'BEFORE_TURN',
  whenToApply: 'ONCE',
  duration: {
    type: 'PERMANENT',
  },
  name: 'deffence break',
});
const blindCurse = new Status({
  statsAffected: [accuracyCurse],
  appliedOn: 'BEFORE_TURN',
  whenToApply: 'ONCE',
  duration: {
    type: 'TEMPORAL',
  }, name: 'blind Curse',
});
const frozen = new Status({
  statsAffected: [{
    from: 'accuracy',
    to: 'accuracy',
    type: 'DEBUFF_FIXED',
    value: 100,
    recovers: true,
    timesUsed: 0,
  }],
  appliedOn: 'BEFORE_ATTACK',
  duration: {
    type: 'TEMPORAL',
    value: 3,
  },
  whenToApply: 'PER_ACTION',
});

const test1 = new Status({
  statsAffected: [attackBoost],
  appliedOn: 'BEFORE_TURN',
  whenToApply: 'ONCE',
  duration: {
    type: 'TEMPORAL',
    value: 1,
  },
  name: 'attack Buff',
});

const test2 = new Status({
  statsAffected: [attackBoost],
  appliedOn: 'BEFORE_TURN',
  whenToApply: 'ONCE',
  duration: {
    type: 'PERMANENT',
  },
  name: 'attack Buff',
});

// +10 def todos las activaciones
const test3 = new Status({
  statsAffected: [defenceDebuff],
  appliedOn: 'BEFORE_TURN',
  whenToApply: 'PER_ACTION',
  duration: {
    type: 'PERMANENT',
  },
  name: 'attack Buff',
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
  hardDefenceDebuff,
};
