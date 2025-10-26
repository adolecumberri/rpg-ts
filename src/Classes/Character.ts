import { uniqueID } from '../helpers/common.helpers';
import { NonConflicting, Widen } from '../helpers/type.helpers';
import { AttackFunction, AttackResult, DefenceResult } from '../types/combat.types';
import { CombatBehavior } from './CombatBehavior';
import { BasicStats, Stats } from './Stats';
import { createEventEmitter, wrapWithEvents } from '../helpers/event-wrapper';
import { AnyPropKey } from '../types/character.types';
import { AnyStat } from '../types/stats.types';
import { EventMoment } from '../types/generalEvents.types';


type CharacterBase = {
    id?: string;
    combat?: CombatBehavior;
    stats: Stats;
}
type CharacterConstructor<TProps> = {
    id?: string;
    combat?: CombatBehavior;
    stats?: Stats;
} & Partial<NonConflicting<TProps, CharacterBase>>;

class Character<
    TProps extends object = any
> {
    public readonly id: string;
    public stats: Stats;
    public readonly combat: CombatBehavior;

    private _props: Record<string, any>;
    private _emitter = createEventEmitter();

    constructor(params?: Partial<CharacterConstructor<TProps>>) {
        if (!params) params = {};

        const { id, combat, stats, ...rest } = params;

        this.id = id ?? uniqueID();
        this.stats = stats ?? new Stats();

        this.combat = combat ?? new CombatBehavior({ emitter: this._emitter });
        if (!this.combat.emitter) {
            this.combat.emitter = this._emitter; // combat emite triggers usando el emisor de character
        }

        this._props = rest;
    }

    /**
     *
     * @param arg any ammount of arguments, will be passed to the combat in that order.
     * The first argument will be the character itself.
     * @returns AttackResult
     */
    attack(...arg: any[]): AttackResult {
        this._emitter.emit('before_attack', this, ...arg);

        const result = this.combat.attack(this, ...arg);

        this._emitter.emit('after_attack', result, this, ...arg);
        return result;
    }

    defend(attack: AttackResult): DefenceResult {
        this._emitter.emit('before_defend', this, attack);

        const result = this.combat.defence(this, attack);

        this._emitter.emit('after_defend', result, this, attack);
        return result;
    }

    receiveDamage(value: number) {
        this._emitter.emit('before_receive_damage', this, value);

        const newHp = this.stats.getProp("hp") - value;
        this.stats.setProp("hp", newHp);

        this._emitter.emit('after_receive_damage', this, value);
    }

    heal(value: number) {
        this.stats.setProp('hp', this.stats.getProp('hp') + value);
    }

    isAlive(): boolean {
        return this.stats.getProp('isAlive') === 1;
    }

    getProps() {
        return this._props;
    }

    getProp(key: AnyPropKey): any {
        if (!this._props[key]) {
            throw new Error(`Property "${String(key)}" does not exist in character data`);
        }
        return this._props[key];
    }

    setProp(key: AnyPropKey, value: any) {
        this._props[key] = value;
    }

    setStat(
        key: AnyStat,
        value: number,
    ) {
        this._emitter.emit('before_set_stat', this, key, value);

        this.stats.setProp(key, value);

        this._emitter.emit('after_set_stat', this, key, value);
        if (!this.isAlive()) {
            // emitimos antes y después por si hay handlers que necesiten engancharse
            this._emitter.emit('before_die', this);
            this._emitter.emit('after_die', this);
        }
    }


    deleteProp(key: AnyPropKey) {
        if (this._props[key]) {
            delete this._props[key];
        }
    }

    on(event: EventMoment, listener: (...args: any[]) => void) {
        this._emitter.on(event, listener);
    }

    toJSON() {
        return {
            id: this.id,
            stats: this.stats.toJSON(),
            data: this.getProps(),
        };
    }
}
export { Character };
