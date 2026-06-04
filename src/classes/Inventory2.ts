import type { Character } from "./Character";
import { Item } from "./items/Item";

export type InventorySlot = {
    id: string;
    item: Item;
    quantity: number;
    equipped: boolean;
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

        if (existing) {
            existing.quantity += quantity;
            return;
        }

        this.slots.set(item.id, {
            id: item.id,
            item,
            quantity,
            equipped: false,
        });
    }

    removeItem(itemId: string, quantity: number = 1): void {
        const slot = this.slots.get(itemId);
        if (!slot) return;

        if (slot.equipped && this.owner) {
            slot.item.unEquip(this.owner);
            slot.equipped = false;
        }

        slot.quantity -= quantity;
        if (slot.quantity <= 0) {
            this.slots.delete(itemId);
        }
    }

    equipItem(itemId: string, target: Character = this.requireOwner()): void {
        const slot = this.slots.get(itemId);
        if (!slot) {
            throw new Error(`Item ${itemId} is not in inventory.`);
        }

        if (slot.equipped) return;

        slot.item.equip(target);
        slot.equipped = true;
    }

    unEquipItem(itemId: string, target: Character = this.requireOwner()): void {
        const slot = this.slots.get(itemId);
        if (!slot) {
            throw new Error(`Item ${itemId} is not in inventory.`);
        }

        if (!slot.equipped) return;

        slot.item.unEquip(target);
        slot.equipped = false;
    }

    getItem(itemId: string): Item | undefined {
        return this.slots.get(itemId)?.item;
    }

    getAllItems(): InventorySlot[] {
        return Array.from(this.slots.values());
    }

    getEquippedItems(): Item[] {
        return this.getAllItems()
            .filter((slot) => slot.equipped)
            .map((slot) => slot.item);
    }

    count(): number {
        return this.slots.size;
    }

    clear(): void {
        if (this.owner) {
            for (const slot of this.slots.values()) {
                if (slot.equipped) {
                    slot.item.unEquip(this.owner);
                }
            }
        }

        this.slots.clear();
    }

    private requireOwner(): Character {
        if (!this.owner) {
            throw new Error("Inventory has no owner character assigned.");
        }

        return this.owner;
    }
}
