import { uniqueID } from "../helpers/common.helpers";
import type { Character } from "./Character";
import { Item } from "./items/Item";

export type InventorySlot = {
    id: string;
    item: Item;
    quantity: number;
};

export class Inventory {
    private owner?: Character;
    private slots: Map<string, InventorySlot> = new Map();

    constructor(owner?: Character) {
        this.owner = owner;
    }

    setOwner(owner: Character): void {
        this.owner = owner;
    }

    addItem(item: Item, quantity: number = 1): void {

        const existing = this.slots.get(item.id);

        if (item.category !== "equipment" && existing) {
            existing.quantity += quantity;
            return;
        }

        this.slots.set(item.id, {
            id: item.category === "equipment" ? uniqueID() : item.id,
            item,
            quantity,
        });
    }

    getItem(itemId: string): Item | undefined {
        return this.slots.get(itemId)?.item;
    }

    getAllItems(): InventorySlot[] {
        return Array.from(this.slots.values());
    }

    getAllItemsSortedByCategory(): { [category: string]: InventorySlot[] } {
        const sorted: { [category: string]: InventorySlot[] } = {};
        for (const slot of this.getAllItems()) {
            const category = slot.item.category ?? "equipment";
            if (!sorted[category]) {
                sorted[category] = [];
            }
            sorted[category].push(slot);
        }
        return sorted;
    }

    count(): number {
        return this.slots.size;
    }

    useItem(
        inventorySlotId: string,
        target: Character
    ): boolean {

        const slot = this.slots.get(
            inventorySlotId
        );

        if (!slot) {
            return false;
        }

        const consumed =
            slot.item.definition.onUse?.(
                slot.item,
                target
            ) ?? false;

        if (consumed) {

            slot.quantity--;

            if (slot.quantity <= 0) {
                this.slots.delete(slot.id);
            }
        }

        return consumed;
    }

    private requireOwner(): Character {
        if (!this.owner) {
            throw new Error("Inventory has no owner character assigned.");
        }

        return this.owner;
    }
}
