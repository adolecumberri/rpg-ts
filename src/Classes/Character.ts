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
    stats?: any;
    combat?: any;
  }

type CharacterConstructor<T> = Partial<NonConflicting<T, CharacterBase> & CharacterBase>;

class Character<T extends object = {}> {
    public readonly id: string;
    public readonly stats: Stats<T>;
    public readonly combat: CombatBehavior;

    private _props: Widen<NonConflicting<T, CharacterBase>>;

    constructor(params?: CharacterConstructor<T>) {
        const { id, stats, combat, ...restData } = params ?? {};

        this.id = id ?? uniqueID();
        this.stats = new Stats<T>(stats);
        this.combat = new CombatBehavior(combat);
        this._props = (restData ?? {}) as Widen<NonConflicting<T, CharacterBase>>;
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
        return this.stats.get('isAlive') === 1;
    }

    getData(): Widen<NonConflicting<T, CharacterBase>> {
        return { ...this._props };
    }

    get<K extends keyof Widen<NonConflicting<T, CharacterBase>>>(key: K): Widen<NonConflicting<T, CharacterBase>>[K] {
        if (!(key in this._props)) {
            throw new Error(`Property "${String(key)}" does not exist in character data`);
        }
        return this._props[key];
    }

    set<K extends keyof Widen<NonConflicting<T, CharacterBase>>>(key: K, value: Widen<NonConflicting<T, CharacterBase>>[K]) {
        this._props[key] = value;
    }

    delete<K extends keyof Widen<NonConflicting<T, CharacterBase>>>(key: K) {
        if (key in this._props) {
            delete this._props[key];
        }
    }

    toJSON() {
        return {
            id: this.id,
            stats: this.stats.toJSON(),
            data: this.getData(),
        };
    }
}
export { Character };
