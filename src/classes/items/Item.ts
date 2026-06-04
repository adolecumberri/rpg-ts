import { ModificationTypes } from "../../constants/stats.constants";
import { uniqueID } from "../../helpers/common.helpers";
import type { Character } from "../Character";

export interface ItemEffect {
    stat: string;
    typeOfModification: ModificationTypes;
    value: number;
}

export interface ItemDefinition {
    id?: string | number;
    name: string;
    description?: string;
    effects?: ItemEffect[];
    category?: ItemCategory;
    onEquip?: (self: Item, target: Character) => void;
    onUnEquip?: (self: Item, target: Character) => void;
}

export type ItemCategory =
    | "equipment"
    | "consumable"
    | "quest"
    | "utility";

export class Item {
    readonly id: string;
    readonly definition: ItemDefinition;
    name: string;
    description?: string;
    category: ItemCategory;

    constructor(definition: ItemDefinition) {
        this.definition = definition;
        this.id = String(definition.id ?? uniqueID());
        this.name = definition.name;
        this.description = definition.description;
        this.category = definition.category ?? "equipment";
    }

    getModifierSourceId(): string {
        return `item:${this.id}`;
    }

    equip(target: Character): void {
        const source = target.stats.getModifierSource(this.getModifierSourceId());

        for (const effect of this.definition.effects ?? []) {
            source.setModifier(effect.stat, effect.typeOfModification, effect.value);
        }

        this.definition.onEquip?.(this, target);
    }

    unEquip(target: Character): void {
        target.stats.removeModifierSource(this.getModifierSourceId());
        this.definition.onUnEquip?.(this, target);
    }
}
