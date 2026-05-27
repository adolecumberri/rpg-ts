import { MODIFICATION_TYPES } from "../../src_1/constants/common.constants";
import { DEFAULT_STAT_MODIFIERS } from "../../src_1/constants/stats.constants";


// just an string taht represent an stat in the Stat object.
export type AnyStat = string;

// keys of modifications that an stat can receive.
export type ModificationKeys = typeof MODIFICATION_TYPES[keyof typeof MODIFICATION_TYPES];

export type ModifiersRecord = Record<AnyStat, Record<ModificationKeys, number>>;

type StatsModificationConstructor = { modifiers: ModifiersRecord };


/**
 * Gestiona las modificaciones de estadísticas.
 */
export class StatsModifier {

    modifiers: ModifiersRecord = {};

    constructor(params: StatsModificationConstructor = { modifiers: {} }) {

        this.modifiers = params.modifiers ?? {};
    };

    getStatModifier(key: AnyStat, type: ModificationKeys): number {
        if (!this.modifiers[key]) {
            this.modifiers[key] = { ...DEFAULT_STAT_MODIFIERS };
        }

        return this.modifiers[key][type];
    };

    getAllStatModifiers(key: AnyStat): Record<ModificationKeys, number> {

        if (!this.modifiers[key]) {
            this.modifiers[key] = { ...DEFAULT_STAT_MODIFIERS };
        }

        return this.modifiers[key];
    };

    isPercentageModification(type: ModificationKeys): boolean {
        return type === MODIFICATION_TYPES.BUFF_PERCENTAGE
            || type === MODIFICATION_TYPES.DEBUFF_PERCENTAGE;
    };

    removeStatModifier(stat: AnyStat, type: ModificationKeys) {
        if (this.modifiers[stat]) {
            this.modifiers[stat][type] = DEFAULT_STAT_MODIFIERS[type];
        }
    };

    removeAllStatModifiers(stat: AnyStat) {
        if (this.modifiers[stat]) {
            this.modifiers[stat] = { ...DEFAULT_STAT_MODIFIERS };
        }
    };

    resetAllModifiers() {
        this.modifiers = {};
    }

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

        this.modifiers[stat][type] = value;
    };

    setModifiers(modifiers: ModifiersRecord) {
        this.modifiers = modifiers;
    };


}
