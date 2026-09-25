import { Item } from '../../src';
import type { Character, Inventory, InventorySlot, Team } from '../../src';
import type { EquipmentSlot } from '../../src/classes/items/EquipmentManager';
import { isEquippableCategory } from '../../src/classes/items/Item';
import { INVENTORY } from './config/inventory';

/**
 * Equips a copy of the item to the character, keeping the stack in the
 * inventory. Returns the item that was replaced (if any) to the bag.
 */
export function equipToCharacter(inventory: Inventory, character: Character, itemId: string): boolean {
    const slot = inventory.getItemSlotByItemId(itemId);
    if (!slot || !isEquippableCategory(slot.item.category) || slot.quantity <= 0) {
        return false;
    }

    const instance = new Item(slot.item.definition);
    const slotName = instance.definition.slot;
    if (!slotName) {
        return false;
    }

    const old = character.equipment.get(slotName);
    character.equipment.equipOrReplace(instance, character);
    if (old) {
        inventory.returnAvailable(old.id, 1);
    }

    inventory.consumeAvailable(itemId, 1);
    return true;
}

export function unequipFromCharacter(inventory: Inventory, character: Character, slot: EquipmentSlot): boolean {
    const item = character.equipment.get(slot);
    if (!item) {
        return false;
    }

    character.equipment.unequip(slot, character);
    inventory.returnAvailable(item.id, 1);
    return true;
}

export function useItemOn(inventory: Inventory, slot: InventorySlot, character: Character): boolean {
    return inventory.useItem(slot.id, character);
}

// ---------------------------------------------------------------------------
// Inventory capacity: the shared inventory holds a limited number of
// distinct item stacks (base slots + the bonuses of every equipped bag).
// Equipped items are shown but never count.
// ---------------------------------------------------------------------------

/**
 * Distinct item stacks currently in the inventory.
 */
export function inventorySlotCount(inventory: Inventory): number {
    return inventory.getAllItems().length;
}

/**
 * Party-wide capacity: base slots plus every equipped bag's bonus.
 * The bagSlots field is accessed through a cast so this module never
 * depends on the augmentation being loaded in every program.
 */
export function inventoryCapacity(team: Team): number {
    let capacity = INVENTORY.baseSlots;
    for (const character of team.getAll()) {
        const bag = character.equipment.get('bag');
        const definition = bag?.definition as (Item['definition'] & { bagSlots?: number }) | undefined;
        capacity += definition?.bagSlots ?? 0;
    }
    return capacity;
}

/**
 * True when adding the item would fit: copies of an item already held
 * stack into its existing slot; a new item needs a free slot.
 */
export function canAddItem(team: Team, item: Item): boolean {
    if (team.inventory.getItemSlotByItemId(item.id)) return true;
    return inventorySlotCount(team.inventory) < inventoryCapacity(team);
}

/**
 * Adds an item when capacity allows; returns false when the inventory
 * is full.
 */
export function addItemCapped(team: Team, item: Item, quantity = 1): boolean {
    if (!canAddItem(team, item)) return false;
    team.inventory.addItem(item, quantity);
    return true;
}
