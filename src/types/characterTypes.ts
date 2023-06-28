import {BaseCharacter, Character} from '../classes';
import { ATTACK_TYPE_CONST, DEFENCE_TYPE_CONST } from '../constants';

type AttackType = keyof typeof ATTACK_TYPE_CONST;

interface AttackResult {
    value: number;
    type: AttackType;
}

type DefenceType = keyof typeof DEFENCE_TYPE_CONST;

interface DefenceResult {
    value: number;
    type: DefenceType;
}

interface Stats {
    accuracy: number;
    attack: number;
    attackInterval: number;
    attackSpeed: number;
    crit: number;
    critMultiplier: number;
    totalHp: number;
    defence: number;
    evasion: number;
    hp: number;
};

type keysOfStats = keyof Stats;

type CharacterConstructor = Partial< Omit<BaseCharacter, 'statusManager' | 'stats'> & {
    statusManager?: boolean,
    stats?: Partial<Stats>
}>;

type DynamicCharacterConstructor = {
    new <T extends object>(arg?: T): T & {
        [x in keyof BaseCharacter]: BaseCharacter[x]
    }
}

export {
  AttackResult,
  AttackType,
  CharacterConstructor,
  DefenceResult,
  DefenceType,
  Stats,
  keysOfStats,
  DynamicCharacterConstructor,
};
