
import { DEFAULT_COMBAT_BEHAVIOR_CONFIG } from '../constants/combat.constants';
import {
    AttackFunction,
    AttackType,
    CombatBehaviorConstructor,
    DamageCalculation,
    DefenceCalculation,
    DefenceFunction,
} from '../types/combat.types';
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


    get attack(): AttackFunction {
        return this._attack;
    }

    set attack(fn: AttackFunction) {
        this._attack = fn;
    }

    get damageCalculation(): DamageCalculation {
        return this._damageCalculation;
    }

    set damageCalculation(calc: DamageCalculation) {
        this._damageCalculation = calc;
    }

    calculateDamage(type: AttackType, stats: Stats<any>): number {
        const fn = this._damageCalculation[type];
        if (!fn) throw new Error(`Missing damage calculation for attack type: ${type}`);
        return fn(stats);
    }

    get defence(): DefenceFunction {
        return this._defence;
    }

    set defence(fn: DefenceFunction) {
        this._defence = fn;
    }

    get defenceCalculation(): DefenceCalculation {
        return this._defenceCalculation;
    }

    set defenceCalculation(fn: DefenceCalculation) {
        this._defenceCalculation = fn;
    }

    calculateDefence(incoming: number, stats: Stats<any>): number {
        return this._defenceCalculation(incoming, stats);
    }
}
const cb = new CombatBehavior();

export { CombatBehavior };
