import { ATTACK_TYPE, DEFENCE_TYPE } from '../constants/common.constants';
import { Character } from '../Classes/Character';
import { Stats } from '../Classes/Stats';

type BaseStats = {
    hp: number;
    totalHp: number;
    attack: number;
    defence: number;
    isAlive: 1 | 0;
};

type AttackFunction = (this: Character, ...arg: any[]) => AttackResult;

interface AttackResult {
    type: AttackType;
    value: number;
    atacker?: Character;
    recordId?: number;
}

type AttackType = typeof ATTACK_TYPE[keyof typeof ATTACK_TYPE];

type DefenceFunction = (this: Character, ...arg: any[]) => DefenceResult;

interface DefenceResult {
    type: DefenceType;
    value: number;
    attacker?: Character;
    recordId?: number;
}

type DefenceType = typeof DEFENCE_TYPE[keyof typeof DEFENCE_TYPE];

type CharacterConstructor<
    ExtraStats extends object = {},
    ExtraProps extends object = any
> = Partial< Omit<Character, 'stats' | 'statusManager' > & {
    stats: Partial<BaseStats> & ExtraStats;
    data: ExtraProps;
    statusManager: boolean;
}>;

type DamageCalculation<T = any> = {
    [key in AttackType]?: (stats: Stats<T> & T) => number;
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
