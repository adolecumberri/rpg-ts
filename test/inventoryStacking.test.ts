import { Character } from '../src/classes/Character';
import { Inventory } from '../src/classes/Inventory';
import { Item } from '../src/classes/items/Item';

function makeSword(): Item {
    return new Item({
        id: 'sword',
        name: 'Sword',
        category: 'weapon',
        slot: 'weapon',
        effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 5 }],
    });
}

describe('Inventory stacking (owned vs available)', () => {
    it('stacks equipment copies when the same item is added twice', () => {
        const inventory = new Inventory();
        inventory.addItem(makeSword());
        inventory.addItem(makeSword());

        const slot = inventory.getItemSlotByItemId('sword')!;
        expect(slot.quantity).toBe(2);
        expect(slot.totalQuantity).toBe(2);
    });

    it('keeps the slot with 0 available while a copy is equipped', () => {
        const character = new Character();
        const inventory = new Inventory(character);
        inventory.addItem(makeSword());

        expect(inventory.equipItem('sword')).toBe(true);

        const slot = inventory.getItemSlotByItemId('sword')!;
        expect(slot.quantity).toBe(0);
        expect(slot.totalQuantity).toBe(1);
        expect(inventory.equipItem('sword')).toBe(false); // nothing available
    });

    it('returns the copy to the bag when unequipped', () => {
        const character = new Character();
        const inventory = new Inventory(character);
        inventory.addItem(makeSword());
        inventory.equipItem('sword');

        expect(inventory.unEquipItem('sword')).toBe(true);

        const slot = inventory.getItemSlotByItemId('sword')!;
        expect(slot.quantity).toBe(1);
        expect(slot.totalQuantity).toBe(1);
    });

    it('sells only the available copies and keeps the equipped one', () => {
        const character = new Character();
        const inventory = new Inventory(character);
        inventory.addItem(makeSword());
        inventory.addItem(makeSword());
        inventory.equipItem('sword'); // 1 equipped + 1 available

        expect(inventory.removeItem('sword', 1)).toBe(true);

        const slot = inventory.getItemSlotByItemId('sword')!;
        expect(slot.quantity).toBe(0);
        expect(slot.totalQuantity).toBe(1);
        expect(inventory.removeItem('sword', 1)).toBe(false); // equipped copy is not sellable
    });

    it('deletes the slot when everything is sold', () => {
        const inventory = new Inventory();
        inventory.addItem(makeSword());

        inventory.removeItem('sword', 1);

        expect(inventory.getItemSlotByItemId('sword')).toBeUndefined();
    });

    it('stacks new copies on top of equipped ones (buying while equipped)', () => {
        const character = new Character();
        const inventory = new Inventory(character);
        inventory.addItem(makeSword());
        inventory.equipItem('sword'); // equipped, 0 available

        inventory.addItem(makeSword()); // buy another one

        const slot = inventory.getItemSlotByItemId('sword')!;
        expect(slot.quantity).toBe(1);
        expect(slot.totalQuantity).toBe(2);
        expect(inventory.equipItem('sword')).toBe(true);
        expect(inventory.getItemSlotByItemId('sword')!.quantity).toBe(0);
    });
});
