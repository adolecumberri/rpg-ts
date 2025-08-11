
import { Character } from '../Classes/Character';
import { Stats } from '../Classes/Stats';
import { ATTACK_TYPE, DEFENCE_TYPE } from '../constants/combat.constants';
import { EventEmitterLike } from '../helpers/event-wrapper';

export type AttackType = typeof ATTACK_TYPE[keyof typeof ATTACK_TYPE];
export type DefenceType = typeof DEFENCE_TYPE[keyof typeof DEFENCE_TYPE];

export interface AttackResult {
  type: AttackType;
  value: number;
  atacker?: Character;
  recordId?: number;
}

export interface DefenceResult {
  type: DefenceType;
  value: number;
  attacker?: Character;
  recordId?: number;
}

export type AttackFunction = (char: Character, ...args: any[]) => AttackResult;
export type DefenceFunction = (char: Character, attack: AttackResult, ...args: any[]) => DefenceResult;

export type DamageCalculation = {
  [key in AttackType]: (stats: Stats<any>) => number;
};

export type DefenceCalculation = (incomingDamage: number, stats: Stats<any>) => number;

export type CombatBehaviorConstructor = {
  attackFn: AttackFunction,
  damageCalc: DamageCalculation,
  defenceFn: DefenceFunction,
  defenceCalc: DefenceCalculation,
  emitter: EventEmitterLike,
}
