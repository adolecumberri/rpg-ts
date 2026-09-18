import { uniqueID } from '../helpers/common.helpers';
import type { Character } from './Character';
import { isEquippableCategory, Item } from './items/Item';

export type InventorySlot = {
    id: string;
    item: Item;
    // Copies currently in the bag (not equipped).
    quantity: number;
    // Copies owned overall (available + equipped).
    totalQuantity: number;
};

export class Inventory {
    private owner?: Character;
    private slots: Map<string, InventorySlot> = new Map();
    private equippedInstances: Map<string, Item[]> = new Map();

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
            existing.totalQuantity += quantity;
            return;
        }

        this.slots.set(item.id, {
            id: isEquippableCategory(item.category) ? uniqueID() : item.id,
            item,
            quantity,
            totalQuantity: quantity,
        });
    }

    getItem(itemId: string): Item | undefined {
        return this.slots.get(itemId)?.item;
    }

    getAllItems(): InventorySlot[] {
        return Array.from(this.slots.values());
    }

    // Items that have at least one available copy (used by the sell UI).
    getAllNotEquipedItems(): InventorySlot[] {
        return Array.from(this.slots.values()).filter(
            (slot) => slot.quantity > 0,
        );
    }

    getItemSlotByItemId(itemId: string): InventorySlot | undefined {
        return this.slots.get(itemId);
    }

    getAllItemsSortedByCategory(): { [category: string]: InventorySlot[] } {
        const sorted: { [category: string]: InventorySlot[] } = {};
        for (const slot of this.getAllItems()) {
            const category = slot.item.category ?? 'equipment';
            if (!sorted[category]) {
                sorted[category] = [];
            }
            sorted[category].push(slot);
        }
        return sorted;
    }

    hasItemByDefinitionId(itemId: string): boolean {
        return this.getAllItems().some(
            (slot) => slot.item.definition.id === itemId,
        );
    }

    /**
     * Removes available (not equipped) copies from the bag.
     * The slot is kept while equipped copies remain, so a fully
     * equipped item still shows in the inventory with quantity 0.
     */
    removeItem(itemId: string, quantity: number = 1): boolean {
        const slot = this.slots.get(itemId);
        if (!slot) {
            return false;
        }

        const removed = Math.min(slot.quantity, quantity);
        if (removed <= 0) {
            return false;
        }

        slot.quantity -= removed;
        slot.totalQuantity -= removed;

        if (slot.totalQuantity <= 0) {
            this.slots.delete(itemId);
            this.equippedInstances.delete(itemId);
        }

        return true;
    }

    count(): number {
        return this.slots.size;
    }

    useItem(
        inventorySlotId: string,
        target: Character,
    ): boolean {
        const slot = this.slots.get(inventorySlotId);
        if (!slot) {
            return false;
        }

        const consumed =
            slot.item.definition.onUse?.(
                slot.item,
                target,
            ) ?? false;

        if (consumed) {
            slot.quantity--;
            slot.totalQuantity--;

            if (slot.totalQuantity <= 0) {
                this.slots.delete(slot.item.id);
            }
        }

        return consumed;
    }

    equipItem(itemId: string): boolean {
        const owner = this.requireOwner();
        const slot = this.slots.get(itemId);

        if (!slot || !isEquippableCategory(slot.item.category) || slot.quantity <= 0) {
            return false;
        }

        // Equips a copy so the stack stays in the bag.
        const instance = new Item(slot.item.definition);
        instance.equip(owner);

        const equipped = this.equippedInstances.get(itemId) ?? [];
        equipped.push(instance);
        this.equippedInstances.set(itemId, equipped);

        slot.quantity -= 1;
        return true;
    }

    unEquipItem(itemId: string): boolean {
        const owner = this.requireOwner();
        const slot = this.slots.get(itemId);
        if (!slot) {
            return false;
        }

        const equipped = this.equippedInstances.get(itemId);
        const instance = equipped?.pop();
        if (!instance) {
            return false;
        }

        instance.unEquip(owner);
        slot.quantity += 1;
        return true;
    }

    // Decrements the available count (used when an external system,
    // like an EquipmentManager, equips a copy of this item).
    consumeAvailable(itemId: string, quantity: number = 1): boolean {
        const slot = this.slots.get(itemId);
        if (!slot || slot.quantity < quantity) {
            return false;
        }

        slot.quantity -= quantity;
        return true;
    }

    // Increments the available count (used when an equipped copy
    // comes back to the bag).
    returnAvailable(itemId: string, quantity: number = 1): void {
        const slot = this.slots.get(itemId);
        if (!slot) {
            return;
        }

        slot.quantity = Math.min(slot.totalQuantity, slot.quantity + quantity);
    }

    private requireOwner(): Character {
        if (!this.owner) {
            throw new Error('Inventory has no owner character assigned.');
        }

        return this.owner;
    }
}
