import { BasicStats } from "../Classes/Stats";
import { ModifiersRecord } from "../Classes/stats/StatsModifiers";
import { MODIFICATION_TYPES } from "../constants/common.constants";
import { AnyStat } from "../types/stats.types";

const fromPropsToModifiers = (props: BasicStats & Record<AnyStat, number>): ModifiersRecord => {
    const modifiers: ModifiersRecord = {};
    for (const key in props) {
        modifiers[key] = {
            [MODIFICATION_TYPES.BUFF_FIXED]: 0,
            [MODIFICATION_TYPES.BUFF_PERCENTAGE]: 0,
            [MODIFICATION_TYPES.DEBUFF_FIXED]: 0,
            [MODIFICATION_TYPES.DEBUFF_PERCENTAGE]: 0,
            procesedStat: props[key],
        }
    }
    return modifiers;
};

export {
    fromPropsToModifiers
};
