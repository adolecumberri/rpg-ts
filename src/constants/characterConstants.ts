import { AttackResult, DefenceResult, Stats } from '../types';

export const ATTACK_TYPE_CONST = {
    NORMAL: 'NORMAL',
    MISS: 'MISS',
    CRITICAL: 'CRITICAL',
    TRUE: 'TRUE',
} as const;

const DEFAULT_DEFENCE_OBJECT: DefenceResult = {
    type: ATTACK_TYPE_CONST.NORMAL,
    value: 0,
};

export const DEFENCE_TYPE_CONST = {
    NORMAL: 'NORMAL',
    EVASION: 'EVASION',
    MISS: 'MISS',
} as const;

const DEFAULT_ATTACK_OBJECT: AttackResult = {
    type: ATTACK_TYPE_CONST.NORMAL,
    value: 0,
};

const DEFAULT_STATS_OBJECT: Partial<Stats> = {
    accuracy: 100,
    attack: 1,
    evasion: 0,
    totalHp: 0,
    defence: 0,
    hp: 0,
    crit: 0,
    critMultiplier: 1,
};

export {
    DEFAULT_ATTACK_OBJECT,
    DEFAULT_DEFENCE_OBJECT,
    DEFAULT_STATS_OBJECT,
};
