import { AttackResult, DefenceResult, Stats } from '../types';

const ATTACK_TYPE_CONST = {
  NORMAL: 'NORMAL',
  MISS: 'MISS',
  CRITICAL: 'CRITICAL',
  TRUE: 'TRUE',
  SKILL: 'SKILL',
} as const;

const DEFAULT_DEFENCE_OBJECT: DefenceResult = {
  type: ATTACK_TYPE_CONST.NORMAL,
  value: 0,
  attacker: null,
};

const DEFENCE_TYPE_CONST = {
  NORMAL: 'NORMAL',
  EVASION: 'EVASION',
  MISS: 'MISS',
  TRUE: 'TRUE',
  SKILL: 'SKILL',
} as const;

const DEFAULT_ATTACK_OBJECT: AttackResult = {
  type: ATTACK_TYPE_CONST.NORMAL,
  value: 0,
  atacker: null,
};

const DEFAULT_STATS_OBJECT: Stats = {
  accuracy: 100,
  attack: 1,
  evasion: 0,
  totalHp: 1,
  defence: 0,
  hp: 1,
  crit: 0,
  critMultiplier: 1,
  attackInterval: 1,
  attackSpeed: 1,
};

export {
  ATTACK_TYPE_CONST,
  DEFENCE_TYPE_CONST,
  DEFAULT_ATTACK_OBJECT,
  DEFAULT_DEFENCE_OBJECT,
  DEFAULT_STATS_OBJECT,
};
