import { ATTACK_TYPE, DEFENCE_TYPE } from '../common/common.constants';
import { Character } from './character';
import { Stats } from './components';

type BaseStats = {
    hp: number;
    totalHp: number;
    attack: number;
    defence: number;
    isAlive: 1 | 0;
};

type AttackFunction = (this: Character<any>, ...arg: any[]) => AttackResult;

interface AttackResult {
    type: AttackType;
    value: number;
    atacker?: Character<any>;
    recordId?: number;
}

type AttackType = typeof ATTACK_TYPE[keyof typeof ATTACK_TYPE];

type DefenceFunction = (this: Character<any>, ...arg: any[]) => DefenceResult;

interface DefenceResult {
    type: DefenceType;
    value: number;
    attacker?: Character;
    recordId?: number;
}

type DefenceType = typeof DEFENCE_TYPE[keyof typeof DEFENCE_TYPE];

type CharacterConstructor<T, U> = Partial<Omit<Character, 'stats'> & {
    stats: Partial<BaseStats> & T;
    props: U;
}>;

type DamageCalculation<T extends {} = {}> = {
    [key in typeof ATTACK_TYPE[keyof typeof ATTACK_TYPE]]?: (stats: Stats<T> & T) => number;
};

type DefenceCalculation<T extends {} = {}> = (this: Character<T>, attack: AttackResult) => number;

export {
    AttackFunction,
    AttackResult,
    AttackType,
    BaseStats,
    CharacterConstructor,
    DamageCalculation,
    DefenceCalculation,
    DefenceFunction,
    DefenceResult,
};
