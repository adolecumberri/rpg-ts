import { Character } from '../Character';
import { Item } from './Item';

export type EquipmentSlot =
    | 'weapon'
    | 'armor'
    | 'accessory';

export class EquipmentManager {
    private slots: Partial<Record<EquipmentSlot, Item>> = {};

    equip(item: Item, target: Character) {
        if (item.category !== 'equipment') {
            throw new Error(
                `${item.name} cannot be equipped`,
            );
        }
        const slot = item.definition.slot;

        if (!slot) {
            throw new Error(
                `${item.name} has no equipment slot`,
            );
        }

        if (this.slots[slot]) {
            throw new Error(
                `${slot} slot is already occupied by ${this.slots[slot]?.name}`,
            );
        }

        item.equip(target);
        this.slots[slot] = item;
    }

    equipOrReplace(item: Item, target: Character) {
        if (item.category !== 'equipment') {
            throw new Error(
                `${item.name} cannot be equipped`,
            );
        }

        const slot = item.definition.slot;

        if (!slot) {
            throw new Error(
                `${item.name} has no equipment slot`,
            );
        }

        const oldItem = this.slots[slot];

        if (oldItem) {
            oldItem.unEquip(target);
        }

        item.equip(target);
        this.slots[slot] = item;
    }

    unequip(slot: EquipmentSlot, target: Character) {
        const item = this.slots[slot];
        if (item) {
            item.unEquip(target);
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
}
