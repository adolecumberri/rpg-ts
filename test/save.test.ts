import { Item } from '../src';
import { WorldSession } from '../worldTest/core/session';
import { buildHero } from '../worldTest/core/config/characters';

describe('save system', () => {
    it('round-trips the full session state', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.addCharacter(buildHero());
        const hero = session.team.getCharacter('hero')!;

        session.itemTable.register({
            id: 'test_sword',
            name: 'Test Sword',
            category: 'weapon',
            slot: 'weapon',
            effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 2 }],
        });
        session.team.inventory.addItem(new Item({
            id: 'test_sword',
            name: 'Test Sword',
            category: 'weapon',
            slot: 'weapon',
            effects: [{ stat: 'attack', typeOfModification: 'BUFF_FIXED', value: 2 }],
        }));

        session.equipTo('test_sword', 'hero');
        hero.experience.gain(100); // level 2
        session.unlockNode('hero', 'warcry');
        session.unlocked.add('east_unlocked');
        session.team.gold += 25;
        session.currentPlaceId = 'hay_field'; // direct assignment
        session.setPosition('hero', 'back');

        const restored = WorldSession.fromSave(session.exportSave());

        expect(restored.currentPlaceId).toBe('hay_field');
        expect(restored.team.gold).toBe(session.team.gold);
        expect(restored.unlocked.has('east_unlocked')).toBe(true);

        const restoredHero = restored.team.getCharacter('hero')!;
        expect(restoredHero.stats.attack).toBe(hero.stats.attack);
        expect(restoredHero.experience.level).toBe(hero.experience.level);
        expect(restoredHero.experience.currentXp).toBe(hero.experience.currentXp);
        expect(restoredHero.equipment.get('weapon')?.id).toBe('test_sword');
        expect(restoredHero.position).toBe('back');
        expect(restored.skillTreeOf('hero')!.isLearned('warcry')).toBe(true);

        // inventory: 1 owned, 0 available because the sword is equipped
        const sword = restored.team.inventory.getItemSlotByItemId('test_sword')!;
        expect(sword.totalQuantity).toBe(1);
        expect(sword.quantity).toBe(0);
    });

    it('heals saves from before the act content existed', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const data = session.exportSave();

        // Simulate the old blank-world save: no characters and a place
        // that no longer exists.
        data.currentPlaceId = 'central_town';
        data.team = [];
        data.roster = [];
        data.inventory = [];

        const restored = WorldSession.fromSave(data);

        expect(restored.currentPlaceId).toBe('farm');
        expect(restored.team.getCharacter('player')).toBeDefined();
        expect(restored.roster.all()).toHaveLength(13); // player + 12 farmers
    });

    it('rejects saves with an unknown version', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const data = session.exportSave();
        data.version = 999;

        expect(() => WorldSession.fromSave(data)).toThrow();
    });
});
