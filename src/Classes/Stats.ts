import { DEFAULT_STATS } from "../constants/stats.constants";
import { lifeCheckHelper } from "../helpers/common.helpers";

export interface Stats {
    attack: number;
    defence: number;
    isAlive: number;
    totalHp: number;
    hp: number;
}

export class Stats {

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

}

