import { MODIFICATION_TYPES } from "../../constants/common.constants";
import { ModificationsType } from "../../types/common.types"
import { AnyStat } from "../../types/stats.types";


type ModifiersRecord = Record<AnyStat, Record<ModificationsType, number>>;
type StatsModificationConstructor = Partial<StatsModifiers>

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

    calculateStatValue(baseValue: number, key: AnyStat): number {
        const statModifiers = this.getModifiersForStat(key);
        let modifiedValue = baseValue;

        // Aplicar buffs fijos
        modifiedValue += statModifiers[MODIFICATION_TYPES.BUFF_FIXED];
        // Aplicar debuffs fijos
        modifiedValue -= statModifiers[MODIFICATION_TYPES.DEBUFF_FIXED];
        // Aplicar buffs porcentuales - debuffs porcentuales
        modifiedValue += (modifiedValue * (statModifiers[MODIFICATION_TYPES.BUFF_PERCENTAGE]
            - statModifiers[MODIFICATION_TYPES.DEBUFF_PERCENTAGE])) / 100;

        return modifiedValue;
    };

    getModifier(key: AnyStat, type: ModificationsType): number {
        return this.modifiers[key]?.[type] ?? 0;
    };

    getModifiersForStat(key: AnyStat): Record<ModificationsType, number> {
        return this.modifiers[key] ?? {
            [MODIFICATION_TYPES.BUFF_FIXED]: 0,
            [MODIFICATION_TYPES.BUFF_PERCENTAGE]: 0,
            [MODIFICATION_TYPES.DEBUFF_FIXED]: 0,
            [MODIFICATION_TYPES.DEBUFF_PERCENTAGE]: 0,
        }
    };

    isPercentageModification(type: ModificationsType): boolean {
        return type === MODIFICATION_TYPES.BUFF_PERCENTAGE
            || type === MODIFICATION_TYPES.DEBUFF_PERCENTAGE;
    };

    removeModifier(stat: AnyStat, type: ModificationsType) {
        if (this.modifiers[stat]) {
            this.modifiers[stat][type] = 0;
        }
    };

    removeModifiers() {
        this.modifiers = {};
    };

    setModifier(stat: AnyStat, type: ModificationsType, value: number) {
        if (!this.modifiers[stat]) {
            this.modifiers[stat] = {
                [MODIFICATION_TYPES.BUFF_FIXED]: 0,
                [MODIFICATION_TYPES.BUFF_PERCENTAGE]: 0,
                [MODIFICATION_TYPES.DEBUFF_FIXED]: 0,
                [MODIFICATION_TYPES.DEBUFF_PERCENTAGE]: 0,
            };
        }
        this.modifiers[stat][type] = value;
    };

    setModifiers(modifiers: ModifiersRecord) {
        this.modifiers = modifiers;
    };

}