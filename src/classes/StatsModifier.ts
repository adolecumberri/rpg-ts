import { DEFAULT_STAT_MODIFIERS, MODIFICATION_TYPES, ModificationTypes } from "../constants/stats.constants";
import { AnyStat } from "./Stats";

export type ModifiersRecord = Record<AnyStat, Record<ModificationTypes, number>>;

type StatsModificationConstructor = { modifiers: ModifiersRecord };


/**
 * Gestiona las modificaciones de estadísticas.
 */
export class StatsModifier {

    modifiers: ModifiersRecord = {};

    constructor(params: StatsModificationConstructor = { modifiers: {} }) {

        this.modifiers = params.modifiers ?? {};
    };

    getStatModifier(key: AnyStat, type: ModificationTypes): number {
        if (!this.modifiers[key]) {
            this.modifiers[key] = { ...DEFAULT_STAT_MODIFIERS };
        }

        return this.modifiers[key][type];
    };

    getAllStatModifiers(key: AnyStat): Record<ModificationTypes, number> {

        if (!this.modifiers[key]) {
            this.modifiers[key] = { ...DEFAULT_STAT_MODIFIERS };
        }

        return this.modifiers[key];
    };

    removeStatModifier(stat: AnyStat, type: ModificationTypes) {
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
    setModifier(stat: AnyStat, type: ModificationTypes, value: number) {
        if (!this.modifiers[stat]) {
            this.modifiers[stat] = { ...DEFAULT_STAT_MODIFIERS };
        }

        this.modifiers[stat][type] = value;
    };

    setModifiers(modifiers: ModifiersRecord) {
        this.modifiers = modifiers;
    };


}
