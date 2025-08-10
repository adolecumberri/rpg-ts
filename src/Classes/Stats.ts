import { DEFAULT_STATS } from '../constants/stats.constants';
import { NonConflicting, Widen } from '../helpers/type.helpers';

export type BasicStats = {
    attack: number;
    defence: number;
    isAlive: 0 | 1;
    totalHp: number;
    hp: number;
};

type CharacterConstructor<T> = Partial<NonConflicting<T, BasicStats> & BasicStats>


export class Stats<T extends Record<string, any> = {}> {
    private _prop: Widen<NonConflicting<T, BasicStats>> & BasicStats;

    constructor(defaultStats?: CharacterConstructor<T>) {
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
                totalHp: totalHpProvided,
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

    getProp<K extends keyof (NonConflicting<T, BasicStats> & BasicStats)>(
        key: K,
    ): (NonConflicting<T, BasicStats> & BasicStats)[K] {
        if (!(key in this._prop)) {
            throw new Error(`Property "${String(key)}" does not exist in stats`);
        }
        console.log('aaa', key, this._prop[key]);
        return this._prop[key];
    }

    setProp<K extends keyof (NonConflicting<T, BasicStats> & BasicStats)>(
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
