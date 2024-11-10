import { ATTACK_TYPE } from '../common/common.constants';
import { Character } from './character';
import { Stats } from './components';

type BaseStats = {
    hp: number;
    totalHp: number;
    attack: number;
    defence: number;
    isAlive: 1 | 0;
  };

interface AttackResult {
    type: string;
    value: number;
    atacker?: Character;
    recordId?: number;
}

type CharacterConstructor<T > = Partial<Omit<Character, 'stats'> & {
    stats: Partial<BaseStats> & T;
}>

type DamageCalculation = {
    [key in typeof ATTACK_TYPE[keyof typeof ATTACK_TYPE]]?: (stats: Stats) => number | (() => number);
};

export {
    AttackResult,
    BaseStats,
    CharacterConstructor,
    DamageCalculation,
};
