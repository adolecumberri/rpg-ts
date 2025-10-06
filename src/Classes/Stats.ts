import { DEFAULT_STATS } from '../constants/stats.constants';
import { lifeCheckHelper } from '../helpers/common.helpers';
import { NonConflicting, Widen } from '../helpers/type.helpers';
import { AnyStat, StatModifier, StatModifierType } from '../types/stats.types';

export type BasicStats = {
    attack: number;
    defence: number;
    isAlive: 0 | 1;
    totalHp: number;
    hp: number;
};

type StatsConstructor<T> = Partial<NonConflicting<T, BasicStats> & BasicStats>


export class Stats<T extends { [K in keyof T]: number }> {
    private _prop: Widen<NonConflicting<T, BasicStats>> & BasicStats;

    private modifiers: Partial<Record<keyof (T & BasicStats), StatModifier[]>> = {};

    constructor(defaultStats?: StatsConstructor<T>) {
        const { totalHp, hp, ...restData } = defaultStats ?? {};

        const totalHpProvided = defaultStats ?
            Math.max(
                totalHp ?? DEFAULT_STATS.totalHp,
                hp ?? DEFAULT_STATS.hp,
            ) :
            DEFAULT_STATS.totalHp;

        this._prop = Object.assign({ ...DEFAULT_STATS },
            {
                ...defaultStats,
                ...lifeCheckHelper({ hp, totalHp }),
            },
        ) as unknown as Widen<NonConflicting<T, BasicStats>> & BasicStats;


        // {
        //     ...DEFAULT_STATS,
        //     ...(defaultStats as any),
        //     totalHp: totalHpProvided,
        // } as Widen<NonConflicting<T, BasicStats>>; ;
    }

    private setHp(newHp: number) {
        this._prop.isAlive = newHp > 0 ? 1 : 0;
        this._prop.hp = Math.min(this._prop.totalHp, Math.max(0, newHp));
    }

    receiveDamage(damage: number) {
        this.setHp(
            Math.min(this._prop.totalHp, Math.max(0, this._prop.hp - damage)),
        );
    }

    heal(heal: number) {
        this.setHp(
            Math.max(this._prop.totalHp, this._prop.hp + heal),
        );
    }

    getProp<K extends keyof (NonConflicting<T, BasicStats> & BasicStats)>(stat: K): number {
        let value = this.getProp(stat);

        const mods = this.modifiers[stat] || [];

        // Primero aplicamos los modificadores fijos
        const fixedTotal = mods
            .filter((m) => m.type === 'FIXED')
            .reduce((a, b) => a + b.value, 0);
        value += fixedTotal;

        // Después aplicamos los porcentajes
        const percentTotal = mods
            .filter((m) => m.type === 'PERCENTAGE')
            .reduce((a, b) => a + b.value, 0);
        value = value + (value * percentTotal) / 100;

        return value;
    }


    setProp<K extends keyof (NonConflicting<T, BasicStats> & BasicStats)>(
        key: K,
        value: number,
    ) {
        if (key === 'hp') {
            this.setHp(value as number);
        } else {
            this._prop[key] = value as (NonConflicting<T, BasicStats> & BasicStats)[K];
        }
    }

    /** Añade un modificador fijo o porcentual */
    modify(stat: AnyStat, type: StatModifierType, value: number) {
        if (!this.modifiers[stat]) {
            this.modifiers[stat] = [];
        }
        this.modifiers[stat]!.push({ type, value });
    }

    /** Elimina un modificador concreto */
    revert(stat: AnyStat, type: StatModifierType, value: number) {
        if (!this.modifiers[stat]) return;
        this.modifiers[stat] = this.modifiers[stat]!.filter(
            (m) => !(m.type === type && m.value === value),
        );
    }

    /** Devuelve snapshot de modificadores (debug/testing) */
    getModifiers<K extends keyof T>(stat: K): StatModifier[] {
        return this.modifiers[stat] || [];
    }

    /**
     * Devuelve todas las estadísticas actuales.
     */
    toJSON(): (NonConflicting<T, BasicStats> & BasicStats) {
        return { ...this._prop };
    }
}
