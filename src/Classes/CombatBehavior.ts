import { ATTACK_TYPE, DEFAULT_COMBAT_BEHAVIOR_CONFIG, DEFENCE_TYPE } from '../constants/combat.constants';
import { Character } from './Character';
import { Stats } from './Stats';



export type AttackType = typeof ATTACK_TYPE[keyof typeof ATTACK_TYPE];
export type DefenceType = typeof DEFENCE_TYPE[keyof typeof DEFENCE_TYPE];

export interface AttackResult {
    type: AttackType;
    value: number;
    attacker?: Character;
    recordId?: number;
}
export interface DefenceResult {
    type: DefenceType;
    value: number;
    attacker?: Character;
    recordId?: number;
}

export type AttackFunction = (attacker: Character, ...args: any[]) => AttackResult;
export type DefenceFunction = (defender: Character, attack: AttackResult, ...args: any[]) => DefenceResult;

// export type DamageCalculation = {
//     [key in AttackType]: (stats: Stats) => number;
// };

export type DamageCalculation = (stats: Stats) => number;

export type DefenceCalculation = (incomingDamage: number, stats: Stats) => number;

export type CombatBehaviorConstructor = {
    attack: AttackFunction,
    damageCalculation: DamageCalculation,
    defence: DefenceFunction,
    defenceCalculation: DefenceCalculation,
}

export class CombatBehavior {

    attack: AttackFunction;
    defence: DefenceFunction;
    damageCalculation: DamageCalculation;
    defenceCalculation: DefenceCalculation;

    constructor(config: Partial<CombatBehaviorConstructor> = {}) {
        const fallback = DEFAULT_COMBAT_BEHAVIOR_CONFIG;

        this.attack = config.attack || fallback.attack;
        this.damageCalculation = config.damageCalculation || fallback.damageCalculation;
        this.defence = config.defence || fallback.defence;
        this.defenceCalculation = config.defenceCalculation || fallback.defenceCalculation;
    }

    

}