import { getRandomInt, uniqueID } from '../helpers/common.helpers';
import { NonConflicting, Widen } from '../helpers/type.helpers';
import {
    AttackResult,
    DefenceResult,
} from '../types/combat.types';


import { CombatBehavior } from './CombatBehavior';
import { BasicStats, Stats } from './Stats';

type CharacterBase = {
    id?: string;
    stats: Stats<any>;
    combat?: CombatBehavior;
  }

type CharacterConstructor<TProps, TStatData extends Record<string, any> = {}> = {
  id?: string;
  combat?: CombatBehavior;
  stats?: Stats<TStatData>;
} & Partial<NonConflicting<TProps, CharacterBase>>;

class Character<
    TProps extends object = {},
    TStatData extends Record<string, any> = {}
  > {
    public readonly id: string;
    public readonly stats: Stats<TStatData>;
    public readonly combat: CombatBehavior;

    private _props: Widen<NonConflicting<TProps, CharacterBase>>;

    constructor(params?: Partial<CharacterConstructor<TProps, TStatData>>) {
        if (!params) {
            params = {};
        }

        const { id, combat, stats, ...restData } = params;

        this.id = id ?? uniqueID();
        this.stats = stats ?? new Stats() as Stats<TStatData>;
        this.combat = combat ?? new CombatBehavior();
        this._props = restData as Widen<NonConflicting<TProps, CharacterBase>>;
    }

    attack(): AttackResult {
        return this.combat.attack(this);
    }

    defend(attack: AttackResult): DefenceResult {
        return this.combat.defence(this, attack);
    }

    receiveDamage(value: number) {
        this.stats.receiveDamage(value);
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

    getProp<K extends keyof Widen<NonConflicting<TProps, CharacterBase>>>(key: K): Widen<NonConflicting<TProps, CharacterBase>>[K] {
        if (!(key in this._props)) {
            throw new Error(`Property "${String(key)}" does not exist in character data`);
        }
        return this._props[key];
    }

    setProp<K extends keyof Widen<NonConflicting<TProps, CharacterBase>>>(key: K, value: Widen<NonConflicting<TProps, CharacterBase>>[K]) {
        this._props[key] = value;
    }

    delete<K extends keyof Widen<NonConflicting<TProps, CharacterBase>>>(key: K) {
        if (key in this._props) {
            delete this._props[key];
        }
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
