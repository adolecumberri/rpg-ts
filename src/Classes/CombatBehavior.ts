
import { DEFAULT_COMBAT_BEHAVIOR_CONFIG } from '../constants/combat.constants';
import { EventEmitterLike, wrapWithEvents } from '../helpers/event-wrapper';
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
    private _attack!: AttackFunction;
    private _defence!: DefenceFunction;
    private _damageCalculation: DamageCalculation;
    private _defenceCalculation: DefenceCalculation;
    private _emitter?: EventEmitterLike;

    constructor(config: Partial<CombatBehaviorConstructor> = {}, emitter?: EventEmitterLike) {
        const fallback = DEFAULT_COMBAT_BEHAVIOR_CONFIG;

        this._emitter = emitter;

        this._attack = this._wrapWithEvents(
            'attack',
            config.attackFn ?? fallback.attackFn,
        );

        this._defence = this._wrapWithEvents(
            'defence',
            config.defenceFn ?? fallback.defenceFn,
        );

        this._damageCalculation = config.damageCalc ?? fallback.damageCalc;
        this._defenceCalculation = config.defenceCalc ?? fallback.defenceCalc;
    }

    get attack(): AttackFunction {
        return this._attack;
    }
    set attack(fn: AttackFunction) {
        this._attack = wrapWithEvents('attack', fn);
    }

    get defence(): DefenceFunction {
        return this._defence;
    }
    set defence(fn: DefenceFunction) {
        this._defence = this._wrapWithEvents('defence', fn);
    }

    calculateDamage(type: AttackType, stats: Stats<any>): number {
        const fn = this._damageCalculation[type];
        if (!fn) throw new Error(`Missing damage calculation for attack type: ${type}`);
        return fn(stats);
    }

    calculateDefence(incoming: number, stats: Stats<any>): number {
        return this._defenceCalculation(incoming, stats);
    }
}

export { CombatBehavior };
