import { uniqueID } from '../helpers/common.helpers';
import { NonConflicting, Widen } from '../helpers/type.helpers';
import { AttackFunction, AttackResult, DefenceResult } from '../types/combat.types';
import { CombatBehavior } from './CombatBehavior';
import { BasicStats, Stats } from './Stats';
import { createEventEmitter, wrapWithEvents } from '../helpers/event-wrapper';


type CharacterBase = {
    id?: string;
    combat?: CombatBehavior;
    stats: Stats<any>;
}

type CharacterConstructor<TProps, TStatData extends Record<string, any> = {}> = {
    id?: string;
    combat?: CombatBehavior;
    stats?: Stats<TStatData>;
} & Partial<NonConflicting<TProps, CharacterBase>>;

class Character<
    TProps extends object = any,
    TStatData extends Record<string, any> = {}
> {
    public readonly id: string;
    public stats: Stats<TStatData>;
    public readonly combat: CombatBehavior;

    private _props: Widen<NonConflicting<TProps, CharacterBase>>;
    private _emitter = createEventEmitter();

    constructor(params?: Partial<CharacterConstructor<TProps, TStatData>>) {
        if (!params) {
            params = {};
        }

        const { id, combat, stats, ...restData } = params;

        this.id = id ?? uniqueID();
        this.stats = stats ?? new Stats() as Stats<TStatData>;

        this.combat = combat ?? new CombatBehavior({ emitter: this._emitter });
        if (!this.combat.emitter) {
            this.combat.emitter = this._emitter; // combat emite triggers usando el emisor de character
        }


        this._props = restData as Widen<NonConflicting<TProps, CharacterBase>>;
    }

    /**
     *
     * @param arg any ammount of arguments, will be passed to the combat in that order.
     * The first argument will be the character itself.
     * @returns AttackResult
     */
    attack(...arg: any[]): AttackResult {
        return this.combat.attack(this, ...arg);
    }

    defend(attack: AttackResult): DefenceResult {
        return this.combat.defence(this, attack);
    }

    receiveDamage(value: number) {
        this._emitter.emit('before_receive_damage', this, value);

        this.stats.receiveDamage(value);

        // Emitimos after_receive_damage para que listeners lo sepan
        this._emitter.emit('after_receive_damage', this, value);
    }

    heal(value: number) {
        this.stats.heal(value);
    }

    isAlive(): boolean {
        return this.stats.getProp('isAlive') === 1;
    }

    getProps(): Widen<NonConflicting<TProps, CharacterBase>> {
        return { ...this._props };
    }

    getProp<K extends keyof Widen<NonConflicting<TProps, CharacterBase>>>(key: K) {
        if (!(key in this._props)) {
            throw new Error(`Property "${String(key)}" does not exist in character data`);
        }
        return this._props[key];
    }

    setProp<K extends keyof Widen<NonConflicting<TProps, CharacterBase>>>(key: K, value: Widen<NonConflicting<TProps, CharacterBase>>[K]) {
        this._props[key] = value;
    }

    setStat<K extends keyof (NonConflicting<TStatData, BasicStats> & BasicStats)>(
        key: K,
        value: number,
    ) {
        this.stats.setProp(key, value);

        if (!this.isAlive()) {
            // emitimos antes y después por si hay handlers que necesiten engancharse
            this._emitter.emit('before_die', this);
            this._emitter.emit('after_die', this);
        }
    }


    deleteProp<K extends keyof Widen<NonConflicting<TProps, CharacterBase>>>(key: K) {
        if (key in this._props) {
            delete this._props[key];
        }
    }

    on(event: string, listener: (...args: any[]) => void) {
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
