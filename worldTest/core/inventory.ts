import { Item } from '../../src';
import type { Character, Inventory, InventorySlot } from '../../src';
import type { EquipmentSlot } from '../../src/classes/items/EquipmentManager';
import { isEquippableCategory } from '../../src/classes/items/Item';

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
