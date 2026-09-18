import { ItemTable } from '../worldTest/core/loot/itemTable';
import { DropTable } from '../worldTest/core/loot/dropTable';
import { LootRoller } from '../worldTest/core/loot/lootRoller';
import { WorldSession } from '../worldTest/core/session';

describe('item table', () => {
    it('registers and creates items from data', () => {
        const table = new ItemTable();
        table.register({ id: 'sword', name: 'Sword', category: 'weapon', slot: 'weapon' });

        const item = table.createItem('sword');
        expect(item.id).toBe('sword');
        expect(item.category).toBe('weapon');
        expect(item.definition.slot).toBe('weapon');
    });

    it('rejects duplicate registrations', () => {
        const table = new ItemTable();
        table.register({ id: 'sword', name: 'Sword', category: 'weapon' });

        expect(() => table.register({ id: 'sword', name: 'Sword 2', category: 'weapon' })).toThrow();
    });

    it('throws when creating an unknown item', () => {
        const table = new ItemTable();
        expect(() => table.createItem('nope')).toThrow();
    });
});

describe('loot roller', () => {
    const table = new DropTable([
        { itemId: 'potion', chance: 0.5, minQty: 1, maxQty: 2 },
        { itemId: 'gold_coin', chance: 0.25, minQty: 1, maxQty: 1 },
    ]);

    it('drops every entry when all chances pass', () => {
        const roller = new LootRoller(() => 0);
        expect(roller.roll(table)).toEqual([
            { itemId: 'potion', quantity: 1 },
            { itemId: 'gold_coin', quantity: 1 },
        ]);
    });

    it('drops nothing when no chance passes', () => {
        const roller = new LootRoller(() => 0.99);
        expect(roller.roll(table)).toEqual([]);
    });

    it('rolls quantities inside the min/max range', () => {
        // potion: 0.1 passes the 0.5 chance; qty roll 0.9 -> 1 + floor(0.9 * 2) = 2
        // gold_coin: 0.99 does not pass the 0.25 chance
        const values = [0.1, 0.9, 0.99];
        let index = 0;
        const roller = new LootRoller(() => values[index++] ?? 0.99);

        expect(roller.roll(table)).toEqual([{ itemId: 'potion', quantity: 2 }]);
    });
});

describe('session loot', () => {
    it('grants npc drops to the team inventory on victory', () => {
        const session = new WorldSession({ random: () => 0 }); // all chances pass
        const npc = session.findNpc('goblin')!;
        const before = session.team.inventory.getItemSlotByItemId('health_potion')?.totalQuantity ?? 0;

        const result = session.finishCombat('won', { npc, placeId: 'forest' });

        expect(result.drops.length).toBeGreaterThan(0);
        const after = session.team.inventory.getItemSlotByItemId('health_potion')?.totalQuantity ?? 0;
        expect(after).toBeGreaterThan(before);
        expect(session.findNpc('goblin')).toBeDefined(); // grunt npc respawns with full hp
    });

    it('only awards drops that exist in the item table', () => {
        const session = new WorldSession({ random: () => 0 });
        const npc = session.findNpc('goblin')!;

        const result = session.finishCombat('won', { npc, placeId: 'forest' });

        for (const drop of result.drops) {
            expect(session.itemTable.has(drop.itemId)).toBe(true);
        }
    });

    it('does not drop loot on defeat', () => {
        const session = new WorldSession({ random: () => 0 });
        const before = session.team.inventory.getAllItems().length;

        const result = session.finishCombat('lost', { placeId: 'forest' });

        expect(result.drops).toEqual([]);
        expect(session.team.inventory.getAllItems().length).toBe(before);
        expect(session.currentPlaceId).toBe('central_town');
    });

    it('awards bandit drops on group victories', () => {
        const session = new WorldSession({ random: () => 0 });
        const before = session.team.inventory.getItemSlotByItemId('health_potion')?.totalQuantity ?? 0;

        const result = session.finishCombat('won', { placeId: 'training' });

        expect(result.drops.length).toBeGreaterThan(0);
        const after = session.team.inventory.getItemSlotByItemId('health_potion')?.totalQuantity ?? 0;
        expect(after).toBeGreaterThan(before);
    });
});
