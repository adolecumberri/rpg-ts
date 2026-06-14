import { ModificationTypes } from "../../constants/stats.constants";
import { uniqueID } from "../../helpers/common.helpers";
import type { Character } from "../Character";
import { AnyStat } from "../Stats";
import { EquipmentSlot } from "./EquipmentManager";

export interface ItemEffect {
    stat: AnyStat;
    typeOfModification: ModificationTypes;
    value: number;
}

export interface ItemDefinition {
    id?: string | number;

    name: string;
    description?: string;

    category?: ItemCategory;

    buyValue?: number;
    sellValue?: number;

    effects?: ItemEffect[];
    slot?: EquipmentSlot;

    onEquip?: (self: Item, target: Character) => void;
    onUnEquip?: (self: Item, target: Character) => void;

    onUse?: (
        self: Item,
        target: Character
    ) => boolean;
} //TODO: añadir condicionante. 

export type ItemCategory =
    | "equipment"
    | "consumable"
    | "quest"
    | "key"
    | "utility";

export class Item {
    id: string;
    readonly definition: ItemDefinition;
    name: string;
    description?: string;
    category: ItemCategory;
    ownerId?: string;
    equiped: boolean;

    buyValue: number;
    sellValue: number;

    constructor(definition: ItemDefinition) {
        this.definition = definition;
        this.id = String(definition.id ?? uniqueID());
        this.name = definition.name;
        this.description = definition.description;
        this.category = definition.category ?? "equipment";
        this.equiped = false;
        this.buyValue = definition.buyValue ?? 0;
        this.sellValue = definition.sellValue ?? 0;
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
