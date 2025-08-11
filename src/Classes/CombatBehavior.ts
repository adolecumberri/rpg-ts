
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

    constructor(config: Partial<CombatBehaviorConstructor> = {}) {
        const fallback = DEFAULT_COMBAT_BEHAVIOR_CONFIG;

        this._emitter = config.emitter;

        this._attack = wrapWithEvents(
            {
                methodName: 'attack',
                fn: config.attackFn ?? fallback.attackFn,
                emitter: this._emitter,
            },
        );

        this._defence = wrapWithEvents(
            {
                methodName: 'defence',
                fn: config.defenceFn ?? fallback.defenceFn,
                emitter: this._emitter,
            },
        );

        this._damageCalculation = config.damageCalc ?? fallback.damageCalc;
        this._defenceCalculation = config.defenceCalc ?? fallback.defenceCalc;
    }

    get attack(): AttackFunction {
        return this._attack;
    }
    set attack(fn: AttackFunction) {
        this._attack = wrapWithEvents({
            methodName: 'attack', fn, emitter: this._emitter,
        });
    }

    get defence(): DefenceFunction {
        return this._defence;
    }
    set defence(fn: DefenceFunction) {
        this._defence = wrapWithEvents({
            methodName: 'defence', fn, emitter: this._emitter,
        });
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
