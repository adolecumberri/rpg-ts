import { WorldSession } from '../worldTest/core/session';
import { FlagRegistry } from '../worldTest/core/flags';
import { FLAGS } from '../worldTest/core/config/flags';
import { winHayFieldBattles } from './support/hayField';

// The sickles mission requires a sickle: grant it before accepting.
function giveSickle(session: WorldSession): void {
    session.team.inventory.addItem(session.itemTable.createItem('sickle'));
}

describe('flag registry', () => {
    it('sets, asks and lists flags idempotently', () => {
        const registry = new FlagRegistry();
        expect(registry.has(FLAGS.SICKLES_DELIVERED)).toBe(false);

        registry.set(FLAGS.SICKLES_DELIVERED);
        registry.set(FLAGS.SICKLES_DELIVERED); // idempotent
        registry.set(FLAGS.WOOD_CHOPPED);

        expect(registry.has(FLAGS.SICKLES_DELIVERED)).toBe(true);
        expect(registry.has(FLAGS.WOOD_CHOPPED)).toBe(true);
        expect(registry.has(FLAGS.COW_SAVED)).toBe(false);
        expect(registry.all().sort()).toEqual([FLAGS.SICKLES_DELIVERED, FLAGS.WOOD_CHOPPED].sort());
    });

    it('restores from a save value', () => {
        const registry = new FlagRegistry();
        registry.restore([FLAGS.COW_SAVED]);
        expect(registry.has(FLAGS.COW_SAVED)).toBe(true);
        expect(registry.has(FLAGS.SICKLES_DELIVERED)).toBe(false);
    });
});

describe('flags in the session', () => {
    it('mission reward steps leave flags in the session registry', () => {
        const session = new WorldSession({ random: () => 0.5 });
        expect(session.hasFlag(FLAGS.SICKLES_DELIVERED)).toBe(false);

        giveSickle(session);
        session.startMission('sickles_to_hay');
        session.travel('hay_field');
        winHayFieldBattles(session);

        expect(session.hasFlag(FLAGS.SICKLES_DELIVERED)).toBe(true);
        expect(session.flags.all()).toContain(FLAGS.SICKLES_DELIVERED);
    });

    it('failed or cancelled missions leave no flags', () => {
        const session = new WorldSession({ random: () => 0.5 });

        giveSickle(session);
        session.startMission('sickles_to_hay');
        session.cancelMission('sickles_to_hay');
        expect(session.hasFlag(FLAGS.SICKLES_DELIVERED)).toBe(false);

        session.startMission('sickles_to_hay');
        session.travel('hay_field');
        session.consumePendingBattle();
        session.finishCombat('fled', { placeId: 'hay_field', fightId: 'hay_goblins', missionId: 'sickles_to_hay' });
        expect(session.hasFlag(FLAGS.SICKLES_DELIVERED)).toBe(false);
    });

    it('world events can leave flags beyond missions', () => {
        const session = new WorldSession({ random: () => 0.5 });

        // e.g. a specific character died during a battle
        session.flags.set('arturo_dead');
        expect(session.hasFlag('arturo_dead')).toBe(true);
    });

    it('round-trips flags through the save', () => {
        const session = new WorldSession({ random: () => 0.5 });

        giveSickle(session);
        session.startMission('sickles_to_hay');
        session.travel('hay_field');
        winHayFieldBattles(session);
        session.flags.set('arturo_dead'); // a world event flag

        const restored = WorldSession.fromSave(session.exportSave());
        expect(restored.hasFlag(FLAGS.SICKLES_DELIVERED)).toBe(true);
        expect(restored.hasFlag('arturo_dead')).toBe(true);
    });

    it('heals saves made before the registry existed', () => {
        const session = new WorldSession({ random: () => 0.5 });

        // Complete the sickles mission so its snapshot carries the flag.
        giveSickle(session);
        session.startMission('sickles_to_hay');
        session.travel('hay_field');
        winHayFieldBattles(session);

        const data = session.exportSave();
        delete (data as { flags?: string[] }).flags; // simulate an old save

        const restored = WorldSession.fromSave(data);
        expect(restored.hasFlag(FLAGS.SICKLES_DELIVERED)).toBe(true);
    });
});
