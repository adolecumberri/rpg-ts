import { DEFAULT_STATS } from "../constants/stats.constants";
import { lifeCheckHelper } from "../helpers/common.helpers";
import { StatsModifier } from "./StatsModifier";
import { DEFAULT_STAT_MODIFIERS, ModificationTypes } from "../constants/stats.constants";

export interface Statistics {
    attack: number;
    defence: number;
    isAlive: number;
    totalHp: number;
    hp: number;
}

// just an string taht represent an stat in the Stat object.
export type AnyStat = keyof Statistics

export class Stats<T extends Statistics = Statistics> implements Statistics {
    // Declare that these exist (populated by Object.assign in constructor)
    declare attack: number;
    declare defence: number;
    declare isAlive: number;
    declare totalHp: number;
    declare hp: number;

    private modifierSources: Map<string, StatsModifier> = new Map();

    get statsModifier(): StatsModifier {
        return this.getModifierSource("status"); //TODO: this¿¿???
    }

    set statsModifier(value: StatsModifier) {
        this.modifierSources.set("status", value ?? new StatsModifier());
    }

    constructor(params: Partial<T> = {} as Partial<T>) {
        if (!params) params = {};

        const {
            totalHp = DEFAULT_STATS.totalHp,
            hp = DEFAULT_STATS.hp,
            ...restData
        } = params;

        const procesedProps = Object.assign({ ...DEFAULT_STATS },
            {
                ...params,
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

    getCombinedStatModifiers(key: keyof Statistics): Record<ModificationTypes, number> {
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

    calculateStatVariation(key: keyof Statistics): number {
        const allStatModifiers = this.getCombinedStatModifiers(key);

        let originalValue = this[key] as number;
        let modifiedValue = 0;

        modifiedValue += allStatModifiers.BUFF_FIXED - allStatModifiers.DEBUFF_FIXED;
        modifiedValue += originalValue * ((allStatModifiers.BUFF_PERCENTAGE - allStatModifiers.DEBUFF_PERCENTAGE) / 100);

        //round on 2 decimals
        modifiedValue = Math.round(modifiedValue * 100) / 100;
        return modifiedValue;
    };

    //create a general get that every time that the user tries to access a value runs
    //the life check helper to update the isAlive and totalHp values.
    get(prop: keyof Statistics) {
        return this.calculateStatVariation(prop);
    }

}

export function createStats<T extends Statistics = Statistics>(params: Partial<T> = {} as Partial<T>): Stats<T> & T {
    return new Stats<T>(params) as Stats<T> & T;
}