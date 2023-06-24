import {Character} from '../classes';
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
    totalHp?: number;
    defence: number;
    evasion: number;
    hp: number;
};

type keysOfStats = keyof Stats;

type Constructor = Partial< Omit<Character, 'statusManager' | 'stats'> & {
    statusManager: boolean,
    stats: Partial<Stats>
}> ;

export {
  AttackResult,
  AttackType,
  Constructor,
  DefenceResult,
  DefenceType,
  Stats,
  keysOfStats,
};
