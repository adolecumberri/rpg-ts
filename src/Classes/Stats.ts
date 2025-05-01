import { DEFAULT_STATS } from '../common/common.constants';
import { BaseStats } from './character.types';


class Stats<T extends {} = {}> implements BaseStats {
    private _hp: number;
    attack: number;
    defence: number;
    isAlive: 1 | 0;
    totalHp: number;

    constructor(defaultStats?: Partial<Stats<T>>) {
        let totalHpProvided = defaultStats?.totalHp ?? DEFAULT_STATS.totalHp;
        const hpProvided = defaultStats?.hp ?? DEFAULT_STATS.hp;
        totalHpProvided = Math.max(totalHpProvided, hpProvided);

        Object.assign(this, {
            ...DEFAULT_STATS,
            ...defaultStats,
        }, {
            totalHp: totalHpProvided,
            hp: hpProvided,
        });
    }

    set hp(newHp: number) {
        this.isAlive = newHp > 0 ? 1 : 0;

        this._hp = this.controlHp(newHp);
    }

    get hp() {
        return this._hp;
    }

    controlHp(value: number) {
        return Math.min( this.totalHp, Math.max(0, value));
    }
} ;

export { Stats };
