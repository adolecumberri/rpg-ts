import { Character, Team } from '../src';
import { SHOP_STOCK, buyItem, sellItem } from '../worldTest/core/shop';
import { equipToCharacter, unequipFromCharacter } from '../worldTest/core/inventory';

describe('shop flow', () => {
    it('buying an item adds a copy to the inventory and charges gold', () => {
        const team = new Team();
        team.gold = 100;
        const entry = SHOP_STOCK.find((e) => e.item.id === 'rusty_sword')!;

        expect(buyItem(team, entry)).toBe('ok');
        expect(team.inventory.getItemSlotByItemId('rusty_sword')?.totalQuantity).toBe(1);
        expect(team.gold).toBe(100 - entry.buyPrice);
    });

    it('buying the same item twice stacks the copies', () => {
        const team = new Team();
        team.gold = 500;
        const entry = SHOP_STOCK.find((e) => e.item.id === 'rusty_sword')!;

        buyItem(team, entry);
        buyItem(team, entry);

        const slot = team.inventory.getItemSlotByItemId('rusty_sword')!;
        expect(slot.quantity).toBe(2);
        expect(slot.totalQuantity).toBe(2);
    });

    it('buying while a copy is equipped increases the available count', () => {
        const team = new Team();
        const hero = new Character({ id: 'hero' });
        team.addCharacter(hero);
        team.gold = 500;
        const entry = SHOP_STOCK.find((e) => e.item.id === 'rusty_sword')!;

        buyItem(team, entry);
        expect(equipToCharacter(team.inventory, hero, 'rusty_sword')).toBe(true);
        expect(team.inventory.getItemSlotByItemId('rusty_sword')!.quantity).toBe(0);

        buyItem(team, entry);

        const slot = team.inventory.getItemSlotByItemId('rusty_sword')!;
        expect(slot.quantity).toBe(1);
        expect(slot.totalQuantity).toBe(2);
    });

    it('selling only removes available copies and keeps equipped ones', () => {
        const team = new Team();
        const hero = new Character({ id: 'hero' });
        team.addCharacter(hero);
        team.gold = 500;
        const entry = SHOP_STOCK.find((e) => e.item.id === 'rusty_sword')!;

        buyItem(team, entry);
        buyItem(team, entry);
        equipToCharacter(team.inventory, hero, 'rusty_sword');

        const slot = team.inventory.getItemSlotByItemId('rusty_sword')!;
        expect(sellItem(team, slot)).toBe(true);
        expect(team.inventory.getItemSlotByItemId('rusty_sword')!.totalQuantity).toBe(1);
        expect(team.inventory.getItemSlotByItemId('rusty_sword')!.quantity).toBe(0);
        expect(sellItem(team, team.inventory.getItemSlotByItemId('rusty_sword')!)).toBe(false);
    });

    it('the slot disappears when everything is sold', () => {
        const team = new Team();
        team.gold = 500;
        const entry = SHOP_STOCK.find((e) => e.item.id === 'rusty_sword')!;

        buyItem(team, entry);
        const slot = team.inventory.getItemSlotByItemId('rusty_sword')!;
        expect(sellItem(team, slot)).toBe(true);
        expect(team.inventory.getItemSlotByItemId('rusty_sword')).toBeUndefined();
    });

    it('unequipping returns the copy to the available count', () => {
        const team = new Team();
        const hero = new Character({ id: 'hero' });
        team.addCharacter(hero);
        team.gold = 500;
        const entry = SHOP_STOCK.find((e) => e.item.id === 'rusty_sword')!;

        buyItem(team, entry);
        equipToCharacter(team.inventory, hero, 'rusty_sword');

        expect(unequipFromCharacter(team.inventory, hero, 'weapon')).toBe(true);
        expect(team.inventory.getItemSlotByItemId('rusty_sword')!.quantity).toBe(1);
    });
});
