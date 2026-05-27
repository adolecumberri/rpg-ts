import { DEFAULT_STATS } from "../constants/stats.constants";
import { lifeCheckHelper } from "../helpers/common.helpers";
import { StatsModifier } from "./StatsModifier";

export interface Stats {
    attack: number;
    defence: number;
    isAlive: number;
    totalHp: number;
    hp: number;
}

// just an string taht represent an stat in the Stat object.
export type AnyStat = string;

export class Stats {

    statsModifier?: StatsModifier;

    constructor(params: Partial<Stats> = {}) {
        if (!params) params = {};

        const {
            totalHp = DEFAULT_STATS.totalHp,
            hp = DEFAULT_STATS.hp,
            ...restData
        } = params;

        const procesedProps = Object.assign({ ...DEFAULT_STATS },
            {
                ...restData,
                ...lifeCheckHelper({
                    hp,
                    totalHp,
                    clamped: true
                }),
            },
        );

        Object.assign(this, procesedProps);
    }

    calculateStatValue(key: keyof Stats): number {

        if (this.statsModifier === undefined) {
            return this[key as keyof Stats] as number;
        }

        const allStatModifiers = this.statsModifier.getAllStatModifiers(key);

        let originalValue = this[key as keyof Stats] as number;
        let modifiedValue = this[key as keyof Stats] as number;

        modifiedValue += allStatModifiers.BUFF_FIXED - allStatModifiers.DEBUFF_FIXED;
        modifiedValue += originalValue * ((allStatModifiers.BUFF_PERCENTAGE - allStatModifiers.DEBUFF_PERCENTAGE) / 100);

        //round on 2 decimals
        modifiedValue = Math.round(modifiedValue * 100) / 100;
        return modifiedValue;
    };

    //create a general get that every time that the user tries to access a value runs
    //the life check helper to update the isAlive and totalHp values.
    get(prop: keyof Stats) {
        return this.calculateStatValue(prop);
    }

}

