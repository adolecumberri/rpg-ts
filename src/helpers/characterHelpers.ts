import { createDefaultObjectGetter } from './commonHelpers';
import { DEFAULT_ATTACK_OBJECT, DEFAULT_DEFENCE_OBJECT, DEFAULT_STATS_OBJECT } from '../constants';
import { DefenceObject, AttackResult, Stats } from '../types';

const getDefaultDefenceObject = createDefaultObjectGetter<DefenceObject>(DEFAULT_DEFENCE_OBJECT);
const getDefaultAttackObject = createDefaultObjectGetter<AttackResult>(DEFAULT_ATTACK_OBJECT);
const getDefaultStatsObject = createDefaultObjectGetter<Stats>(DEFAULT_STATS_OBJECT);

export {
  getDefaultDefenceObject,
  getDefaultAttackObject,
  getDefaultStatsObject,
};
