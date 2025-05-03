import { DEFAULT_STATS } from '../constants/stats.constants';
import { NonConflicting, Widen } from '../helpers/type.helpers';

export type BasicStats = {
    attack: number;
    defence: number;
    isAlive: 1 | 0;
    totalHp: number;
    hp: number;
  };

export class Stats<T extends Record<string, any> = {}> {
    private _prop: Widen<NonConflicting<T, BasicStats>> & BasicStats;

    constructor(defaultStats?: Partial<NonConflicting<T, BasicStats> & BasicStats>) {
        const totalHpProvided = defaultStats ?
            Math.max(
                defaultStats.totalHp ?? DEFAULT_STATS.totalHp,
                defaultStats.hp ?? DEFAULT_STATS.hp,
            ) :
            DEFAULT_STATS.totalHp;

        this._prop = {
            ...DEFAULT_STATS,
            ...(defaultStats as any),
            totalHp: totalHpProvided,
        };
    }

    private setHp(newHp: number) {
        this._prop.isAlive = newHp > 0 ? 1 : 0;
        this._prop.hp = Math.min(this._prop.totalHp, Math.max(0, newHp));
    }

    get<K extends keyof(NonConflicting<T, BasicStats> & BasicStats)>(
        key: K,
    ): (NonConflicting<T, BasicStats> & BasicStats)[K] {
        if (!(key in this._prop)) {
            throw new Error(`Property "${String(key)}" does not exist in stats`);
        }
        return this._prop[key];
    }

    set<K extends keyof(NonConflicting<T, BasicStats> & BasicStats)>(
        key: K,
        value: (NonConflicting<T, BasicStats> & BasicStats)[K],
    ) {
        if (key === 'hp') {
            this.setHp(value as number);
        } else {
            this._prop[key] = value;
        }
    }

    /**
     * Devuelve todas las estadísticas actuales.
     */
    toJSON(): (NonConflicting<T, BasicStats> & BasicStats) {
        return { ...this._prop };
    }
}
