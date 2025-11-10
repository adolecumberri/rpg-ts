import { MODIFICATION_TYPES } from "./common.constants";

const DEFAULT_STATS = {
    attack: 0,
    defence: 0,
    isAlive: 1,
    hp: 1,
    totalHp: 1,
};

const DEFAULT_STAT_MODIFIERS = {
    [MODIFICATION_TYPES.BUFF_FIXED]: 0,
    [MODIFICATION_TYPES.BUFF_PERCENTAGE]: 0,
    [MODIFICATION_TYPES.DEBUFF_FIXED]: 0,
    [MODIFICATION_TYPES.DEBUFF_PERCENTAGE]: 0,
    procesedStat: 0,
    originalStatValue: 0,
};

export {
    DEFAULT_STATS,
    DEFAULT_STAT_MODIFIERS
};
