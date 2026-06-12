import { Character } from "../Character";
import { Statistics } from "../Stats";
import { Item } from "./Item";

export type EquipmentSlot =
    | "weapon"
    | "armor"
    | "accessory";

export class EquipmentManager {

    private slots: Partial<Record<EquipmentSlot, Item>> = {};

    equip(item: Item, ownerId?: string) {
        if (item.category !== "equipment") {
            throw new Error(
                `${item.name} cannot be equipped`
            );
        }
        const slot = item.definition.slot;

        if (!slot) {
            throw new Error(
                `${item.name} has no equipment slot`
            );
        }

        if (this.slots[slot]) {
            throw new Error(
                `${slot} slot is already occupied by ${this.slots[slot]?.name}`
            );
        }

        item.equiped = true;

        this.slots[slot] = item;
    }

    equipOrReplace(item: Item, ownerId?: string) {
        if (item.category !== "equipment") {
            throw new Error(
                `${item.name} cannot be equipped`
            );
        }

        const slot = item.definition.slot;

        if (!slot) {
            throw new Error(
                `${item.name} has no equipment slot`
            );
        }

        const oldItem = this.slots[slot];

        if (oldItem) {
            oldItem.equiped = false;
            oldItem.ownerId = undefined;
        }


        item.equiped = true;
        item.ownerId = ownerId;
        this.slots[slot] = item;

    }

    unequip(slot: EquipmentSlot) {
        const item = this.slots[slot];
        if (item) {
            item.equiped = false;
            item.ownerId = undefined;
        }
        delete this.slots[slot];
    }

    get(slot: EquipmentSlot) {
        return this.slots[slot];
    }

    getAllSlots(): Partial<Record<EquipmentSlot, Item>> {
        return { ...this.slots };
    }

    getEquippedItems(): Item[] {
        return Object
            .values(this.slots)
            .filter(Boolean) as Item[];
    }

    canSlotBeEquipped(slot: EquipmentSlot) {
        return !this.slots[slot];
    }


    calculateStatVariation(statOriginalValue: number, stat: keyof Statistics): number {
        let modifiedValue = 0;
        for (const item of this.getEquippedItems()) {
            for (const effect of item.definition.effects ?? []) {
                if (effect.stat !== stat) {
                    continue;
                }
                switch (effect.typeOfModification) {
                    case "BUFF_FIXED":
                        modifiedValue += effect.value;
                        break;
                    case "BUFF_PERCENTAGE":
                        modifiedValue += statOriginalValue * (effect.value / 100);
                        break;
                    case "DEBUFF_FIXED":
                        modifiedValue -= effect.value;
                        break;
                    case "DEBUFF_PERCENTAGE":
                        modifiedValue -= statOriginalValue * (effect.value / 100);
                        break;
                }
            }
        }
        return modifiedValue;
    }
}