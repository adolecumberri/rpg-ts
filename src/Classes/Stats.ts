import { DEFAULT_STATS } from "../constants/stats.constants";
import { lifeCheckHelper } from "../helpers/common.helpers";
import { StatsModifier } from "./StatsModifier";
import { DEFAULT_STAT_MODIFIERS, ModificationTypes } from "../constants/stats.constants";

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
    private modifierSources: Map<string, StatsModifier> = new Map();

    get statsModifier(): StatsModifier {
        return this.getModifierSource("status"); //TODO: this¿¿???
    }

    set statsModifier(value: StatsModifier) {
        this.modifierSources.set("status", value ?? new StatsModifier());
    }

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
        this.modifierSources.set("status", new StatsModifier());
    }

    getModifierSource(sourceId: string): StatsModifier {
        if (!this.modifierSources.has(sourceId)) {
            this.modifierSources.set(sourceId, new StatsModifier());
        }

        return this.modifierSources.get(sourceId) as StatsModifier;
    }

    setModifierSource(sourceId: string, modifier: StatsModifier): void {
        this.modifierSources.set(sourceId, modifier);
    }

    removeModifierSource(sourceId: string): void {
        this.modifierSources.delete(sourceId);
    }

    clearModifierSources(): void {
        this.modifierSources.clear();
        this.modifierSources.set("status", new StatsModifier());
    }

    getCombinedStatModifiers(key: keyof Stats): Record<ModificationTypes, number> {
        const result: Record<ModificationTypes, number> = { ...DEFAULT_STAT_MODIFIERS };

        for (const source of this.modifierSources.values()) {
            const modifiers = source.getAllStatModifiers(key);
            result.BUFF_FIXED += modifiers.BUFF_FIXED;
            result.BUFF_PERCENTAGE += modifiers.BUFF_PERCENTAGE;
            result.DEBUFF_FIXED += modifiers.DEBUFF_FIXED;
            result.DEBUFF_PERCENTAGE += modifiers.DEBUFF_PERCENTAGE;
        }

        return result;
    }

    calculateStatValue(key: keyof Stats): number {
        const allStatModifiers = this.getCombinedStatModifiers(key);

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

