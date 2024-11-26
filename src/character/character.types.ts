import { ATTACK_TYPE, DEFENCE_TYPE } from '../common/common.constants';
import { Character } from './test';
import { Stats } from './components';

type BaseStats = {
    hp: number;
    totalHp: number;
    attack: number;
    defence: number;
    isAlive: 1 | 0;
  };

  type AttackFunction = (this: Character<any>, ...arg: any[]) => AttackResult

  interface AttackResult {
      type: AttackType;
      value: number;
      atacker?: Character;
      recordId?: number;
    }

    type AttackType = typeof ATTACK_TYPE[keyof typeof ATTACK_TYPE];

    interface DefenceResult {
        type: DefenceType;
        value: number;
        attacker?: Character;
        recordId?: number;
    }

    type DefenceType = typeof DEFENCE_TYPE[keyof typeof DEFENCE_TYPE];

    type CharacterConstructor<T> = Partial<Omit<Character, 'stats'> & {
        stats: Partial<BaseStats> & T;
    }>

type DamageCalculation<T extends {} = {}> ={
    [key in typeof ATTACK_TYPE[keyof typeof ATTACK_TYPE]]?: (stats: Stats<T> & T ) => number;
};

export {
    AttackFunction,
    AttackResult,
    AttackType,
    BaseStats,
    CharacterConstructor,
    DamageCalculation,
    DefenceResult,
};
