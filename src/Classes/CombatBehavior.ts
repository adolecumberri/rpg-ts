
import { DEFAULT_COMBAT_BEHAVIOR_CONFIG } from '../constants/combat.constants';
import {
    AttackFunction,
    AttackResult,
    AttackType,
    CombatBehaviorConstructor,
    DamageCalculation,
    DefenceCalculation,
    DefenceFunction,
    DefenceResult,
} from '../types/combat.types';
import { Character } from './Character';
import { Stats } from './Stats';


class CombatBehavior {
    private _attack: AttackFunction;
    private _defence: DefenceFunction;
    private _damageCalculation: DamageCalculation;
    private _defenceCalculation: DefenceCalculation;

    constructor(config: Partial<CombatBehaviorConstructor> = {}) {
        const fallback = DEFAULT_COMBAT_BEHAVIOR_CONFIG;

        this._attack = config.attackFn ?? fallback.attackFn;
        this._damageCalculation = config.damageCalc ?? fallback.damageCalc;
        this._defence = config.defenceFn ?? fallback.defenceFn;
        this._defenceCalculation = config.defenceCalc ?? fallback.defenceCalc;
    }


    attack(char: Character, ...args: any[]): AttackResult {
        return this._attack(char, ...args);
    };

    calculateDamage(type: AttackType, stats: Stats<any>): number {
        const fn = this._damageCalculation[type];
        if (!fn) throw new Error(`Missing damage calculation for attack type: ${type}`);
        return fn(stats);
    }

    defence(char: Character, incomingAttack: AttackResult, ...args: any[]): DefenceResult {
        return this._defence(char, incomingAttack, ...args);
    }

    calculateDefence(incoming: number, stats: Stats<any>): number {
        return this._defenceCalculation(incoming, stats);
    }
}

export { CombatBehavior };
