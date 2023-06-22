import {DEFAULT_ATTACK_OBJECT, DEFAULT_DEFENCE_OBJECT, DEFAULT_STATS_OBJECT} from '../constants/defaults';
import {AttackObject, DefenceObject, Stats} from '../interfaces';
import {IActivateReturn} from '../interfaces/Status.interface';

/*
 * deploy default defence object
 * param will override default values
 */
const getDefaultDefenceObject = (param?: Partial<DefenceObject>): DefenceObject => {
  return {...DEFAULT_DEFENCE_OBJECT, ...param};
};

const getDefaultAttackObject = (param?: any): AttackObject => {
  return {...DEFAULT_ATTACK_OBJECT, ...param};
};

const getStatsObject = (param?: Partial<Stats>): Partial<Stats> => {
  return {...DEFAULT_STATS_OBJECT, ...param};
};

export {
  getDefaultDefenceObject,
  getDefaultAttackObject,
  getStatsObject,
};
