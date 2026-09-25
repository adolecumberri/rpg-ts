import { WorldSession } from '../worldTest/core/session';

// The sickles mission requires a sickle: grant it before accepting.
function giveSickle(session: WorldSession): void {
    session.team.inventory.addItem(session.itemTable.createItem('sickle'));
}

describe('farm shop', () => {
    it('opens with the sickle and closes once it is bought', () => {
        const session = new WorldSession({ random: () => 0.5 });

        expect(session.shopEntries('farm_shop')).toHaveLength(1);
        expect(session.shopEntries('farm_shop')[0].item.id).toBe('sickle');
        expect(session.shopClosed('farm_shop')).toBe(false);

        const entry = session.shopEntries('farm_shop')[0];
        expect(session.buy('farm_shop', entry)).toBe('ok');

        expect(session.shopEntries('farm_shop')).toHaveLength(0);
        expect(session.shopClosed('farm_shop')).toBe(true);
        expect(session.team.inventory.getItemSlotByItemId('sickle')?.totalQuantity).toBe(1);
    });

    it('refuses to buy a sold-out entry', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const entry = session.shopEntries('farm_shop')[0];

        session.buy('farm_shop', entry);
        expect(session.buy('farm_shop', entry)).toBe('sold_out');
        expect(session.team.gold).toBe(5); // 10 - 5, only one purchase
    });

    it('round-trips the remaining stock through the save', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.buy('farm_shop', session.shopEntries('farm_shop')[0]);

        const restored = WorldSession.fromSave(session.exportSave());
        expect(restored.shopClosed('farm_shop')).toBe(true);
    });

    it('heals saves made before shops existed: shops open full', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const data = session.exportSave();
        delete (data as { shops?: unknown }).shops;

        const restored = WorldSession.fromSave(data);
        expect(restored.shopEntries('farm_shop')).toHaveLength(1);
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
