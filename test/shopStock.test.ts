import { WorldSession } from '../worldTest/core/session';
import { SHOPS } from '../worldTest/core/config/shops';

// The sickles mission requires a sickle: grant it before accepting.
function giveSickle(session: WorldSession): void {
    session.team.inventory.addItem(session.itemTable.createItem('sickle'));
}

// The stock machinery is tested against a shop registered for the test
// (the farm shop itself was emptied by the Order camp shift).
function withStockedShop(): void {
    SHOPS.camp_supplies = {
        id: 'camp_supplies',
        name: 'Camp Supplies',
        stock: [{ itemId: 'sickle', buyPrice: 5 }],
    };
}

describe('farm shop', () => {
    it('opens empty after the story shift to the Order camp', () => {
        const session = new WorldSession({ random: () => 0.5 });

        expect(session.shopEntries('farm_shop')).toHaveLength(0);
        expect(session.shopClosed('farm_shop')).toBe(true);
    });

    it('sells its stock and closes once it is bought', () => {
        withStockedShop();
        const session = new WorldSession({ random: () => 0.5 });

        expect(session.shopEntries('camp_supplies')).toHaveLength(1);
        expect(session.shopEntries('camp_supplies')[0].item.id).toBe('sickle');
        expect(session.shopClosed('camp_supplies')).toBe(false);

        const entry = session.shopEntries('camp_supplies')[0];
        expect(session.buy('camp_supplies', entry)).toBe('ok');

        expect(session.shopEntries('camp_supplies')).toHaveLength(0);
        expect(session.shopClosed('camp_supplies')).toBe(true);
        expect(session.team.inventory.getItemSlotByItemId('sickle')?.totalQuantity).toBe(1);
    });

    it('refuses to buy a sold-out entry', () => {
        withStockedShop();
        const session = new WorldSession({ random: () => 0.5 });
        const entry = session.shopEntries('camp_supplies')[0];

        session.buy('camp_supplies', entry);
        expect(session.buy('camp_supplies', entry)).toBe('sold_out');
        expect(session.team.gold).toBe(5); // 10 - 5, only one purchase
    });

    it('round-trips the remaining stock through the save', () => {
        withStockedShop();
        const session = new WorldSession({ random: () => 0.5 });
        session.buy('camp_supplies', session.shopEntries('camp_supplies')[0]);

        const restored = WorldSession.fromSave(session.exportSave());
        expect(restored.shopClosed('camp_supplies')).toBe(true);
    });

    it('heals saves made before shops existed: shops open full', () => {
        withStockedShop();
        const session = new WorldSession({ random: () => 0.5 });
        const data = session.exportSave();
        delete (data as { shops?: unknown }).shops;

        const restored = WorldSession.fromSave(data);
        expect(restored.shopEntries('camp_supplies')).toHaveLength(1);
    });
});

describe('mission requirements', () => {
    it('refuses the sickles mission without a sickle and reports why', () => {
        const session = new WorldSession({ random: () => 0.5 });

        const met = session.missionRequirementsMet('sickles_to_hay');
        expect(met.ok).toBe(false);
        expect(met.reason).toContain('Sickle');

        expect(session.startMission('sickles_to_hay')).toBe(false);
        expect(session.missions.activeMissions()).toEqual([]);
    });

    it('accepts the mission once the sickle is owned', () => {
        const session = new WorldSession({ random: () => 0.5 });
        giveSickle(session);

        expect(session.missionRequirementsMet('sickles_to_hay').ok).toBe(true);
        expect(session.startMission('sickles_to_hay')).toBe(true);
    });

    it('checks gold requirements too', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.register({
            id: 'rich_quest',
            title: 'Rich Quest',
            requirements: { gold: 100 },
            steps: [{ id: 'done', kind: 'reward', flags: ['rich_done'] }],
        });

        expect(session.missionRequirementsMet('rich_quest').ok).toBe(false);
        expect(session.startMission('rich_quest')).toBe(false);

        session.team.gold = 100;
        expect(session.missionRequirementsMet('rich_quest').ok).toBe(true);
        expect(session.startMission('rich_quest')).toBe(true);
    });
});
