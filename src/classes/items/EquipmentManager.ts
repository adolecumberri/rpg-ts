import { Character } from "../Character";
import { Item } from "./Item";


export class EquipmentManager {
    private equippedItems = new Map<string, Item>();

    equip(character: Character, item: Item) {
        this.equippedItems.set(item.id, item);

        item.equip(character);
    }

    unequip(character: Character, item: Item) {
        this.equippedItems.delete(item.id);

        item.unEquip(character);
    }

    getEquippedItems(): Item[] {
        return [...this.equippedItems.values()];
    }

    isEquipped(itemId: string): boolean {
        return this.equippedItems.has(itemId);
    }
}