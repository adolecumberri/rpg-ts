import { Character } from "../Character";
import { Item } from "./Item";


export class EquipmentManager {
    private equippedItems: Item[] = [];

    equip(character: Character, item: Item) {
        this.equippedItems.push(item);
        item.equip(character);
    }

    unequip(character: Character, item: Item) {
        this.equippedItems =
            this.equippedItems.filter(i => i.id !== item.id);

        item.unEquip(character);
    }

    getEquippedItems() {
        return [...this.equippedItems];
    }
}