import { MODIFICATION_TYPES } from "../../constants/common.constants";
import { DEFAULT_STAT_MODIFIERS } from "../../constants/stats.constants";
import { ModificationKeys, ModificationTypes } from "../../types/common.types"
import { AnyStat } from "../../types/stats.types";
import { BasicStats } from "../Stats";


type ModifiersRecord = Record<AnyStat, Record<ModificationKeys, number>>;
type StatsModificationConstructor = Partial<StatsModifiers> & {
    stats?: BasicStats & Record<AnyStat, number>
}

/**
 * Gestiona las modificaciones de estadísticas.
 */
export class StatsModifiers {

    modifiers: ModifiersRecord = {};

    constructor(params?: StatsModificationConstructor) {
        if (!params) {
            params = {};
        }

        this.modifiers = params.modifiers ?? {};
    };

    calculateStatValue(key: AnyStat): number {
        const statModifiers = this.getModifiersForStat(key);
        let modifiedValue = statModifiers.originalStatValue ?? 0;


        modifiedValue += statModifiers.BUFF_FIXED - statModifiers.DEBUFF_FIXED;
        modifiedValue += modifiedValue * ((statModifiers.BUFF_PERCENTAGE - statModifiers.DEBUFF_PERCENTAGE) / 100);

        return modifiedValue;
    };

    getModifier(key: AnyStat, type: ModificationKeys): number {
        return this.modifiers[key]?.[type] ?? 0;
    };

    getModifiersForStat(key: AnyStat): Record<ModificationKeys, number> {
        return this.modifiers[key] ?? { ...DEFAULT_STAT_MODIFIERS };
    };

    isPercentageModification(type: ModificationTypes): boolean {
        return type === MODIFICATION_TYPES.BUFF_PERCENTAGE
            || type === MODIFICATION_TYPES.DEBUFF_PERCENTAGE;
    };

    removeModifier(stat: AnyStat, type: ModificationKeys) {
        if (this.modifiers[stat]) {
            this.modifiers[stat][type] = 0;
        }
    };

    removeModifiers() {
        this.modifiers = {};
    };

    /**
     * 
     * @param stat stat changed
     * @param type type of modifier
     * @param value value to add to modifier
     * @param statValue statValue user to recalculate the stat
     */
    setModifier(stat: AnyStat, type: ModificationKeys, value: number) {
        if (!this.modifiers[stat]) {
            this.modifiers[stat] = { ...DEFAULT_STAT_MODIFIERS };
        }
        this.modifiers[stat][type] = Math.abs(value);
        this.processProcessedStats(stat);
    };

    setModifiers(modifiers: ModifiersRecord) {
        this.modifiers = modifiers;
    };

    processProcessedStats(stat: AnyStat) {
        const newValue = this.calculateStatValue(stat);
        this.modifiers[stat]["procesedStat"] = newValue;
        return newValue;
    };
}

export {
    ModifiersRecord,
    StatsModificationConstructor,
}