
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

    originalAttackFn: AttackFunction;
    originalDefenceFn: DefenceFunction;

    constructor(config: Partial<CombatBehaviorConstructor> = {}) {
        const fallback = DEFAULT_COMBAT_BEHAVIOR_CONFIG;

        this._emitter = config.emitter;

        this.originalAttackFn = config.attackFn ?? fallback.attackFn;
        this._attack = wrapWithEvents(
            {
                methodName: 'attack',
                fn: config.attackFn ?? fallback.attackFn,
                emitter: this._emitter,
            },
        );

        this.originalDefenceFn = config.defenceFn ?? fallback.defenceFn;
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

    /**
     * args will be a list passed
     * but the first value will be the character (added automatically)
     */
    get attack(): AttackFunction {
        return this._attack;
    }
    set attack(fn: AttackFunction) {
        this.originalAttackFn = fn;
        this._attack = wrapWithEvents({
            methodName: 'attack', fn, emitter: this._emitter,
        });
    }

    get defence(): DefenceFunction {
        return this._defence;
    }
    set defence(fn: DefenceFunction) {
        this.originalDefenceFn = fn;
        this._defence = wrapWithEvents({
            methodName: 'defence', fn, emitter: this._emitter,
        });
    }

    calculateDamage(type: AttackType, stats: Stats): number {
        const fn = this._damageCalculation[type];
        if (!fn) throw new Error(`Missing damage calculation for attack type: ${type}`);
        return fn(stats);
    }

    calculateDefence(incoming: number, stats: Stats): number {
        return this._defenceCalculation(incoming, stats);
    }

    get emitter(): EventEmitterLike | undefined {
        return this._emitter;
    }

    set emitter(emitter: EventEmitterLike | undefined) {
        this._emitter = emitter;
        this._attack = wrapWithEvents({
            methodName: 'attack', fn: this.originalAttackFn, emitter: this._emitter,
        });
        this._defence = wrapWithEvents({
            methodName: 'defence', fn: this.originalDefenceFn, emitter: this._emitter,
        });
    }
}

export { CombatBehavior };
