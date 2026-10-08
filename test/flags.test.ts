import { WorldSession } from '../worldTest/core/session';
import { FlagRegistry } from '../worldTest/core/flags';
import { FLAGS } from '../worldTest/core/config/flags';
import type { Mission } from '../worldTest/core/missions/mission';

// A minimal mission whose reward step takes one flag.
function flaggedMission(id: string, flag: string): Mission {
    return {
        id,
        title: id,
        steps: [
            { id: 'go', kind: 'travel', placeId: 'camp' },
            { id: 'done', kind: 'reward', flags: [flag] },
        ],
    };
}

describe('flag registry', () => {
    it('sets, asks and lists flags idempotently', () => {
        const registry = new FlagRegistry();
        expect(registry.has('alpha')).toBe(false);

        registry.set('alpha');
        registry.set('alpha'); // idempotent
        registry.set('beta');

        expect(registry.has('alpha')).toBe(true);
        expect(registry.has('beta')).toBe(true);
        expect(registry.has('gamma')).toBe(false);
        expect(registry.all().sort()).toEqual(['alpha', 'beta'].sort());
    });

    it('restores from a save value', () => {
        const registry = new FlagRegistry();
        registry.restore(['gamma']);
        expect(registry.has('gamma')).toBe(true);
        expect(registry.has('alpha')).toBe(false);
    });
});

describe('flags in the session', () => {
    it('mission reward steps leave flags in the session registry', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.register(flaggedMission('flag_carrier', 'carried_flag'));

        expect(session.hasFlag('carried_flag')).toBe(false);

        session.startMission('flag_carrier');
        session.travel('camp');

        expect(session.hasFlag('carried_flag')).toBe(true);
        expect(session.flags.all()).toContain('carried_flag');
    });

    it('failed or cancelled missions leave no flags', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.register(flaggedMission('flag_carrier', 'carried_flag'));

        session.startMission('flag_carrier');
        session.cancelMission('flag_carrier');
        expect(session.hasFlag('carried_flag')).toBe(false);

        session.startMission('flag_carrier');
        session.missions.fail('flag_carrier');
        expect(session.hasFlag('carried_flag')).toBe(false);
    });

    it('world events can leave flags beyond missions', () => {
        const session = new WorldSession({ random: () => 0.5 });

        // e.g. a specific character died during a battle
        session.flags.set('arturo_dead');
        expect(session.hasFlag('arturo_dead')).toBe(true);
    });

    it('round-trips flags through the save', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.register(flaggedMission('flag_carrier', 'carried_flag'));
        session.startMission('flag_carrier');
        session.travel('camp');
        session.flags.set('arturo_dead'); // a world event flag

        const restored = WorldSession.fromSave(session.exportSave());
        expect(restored.hasFlag('carried_flag')).toBe(true);
        expect(restored.hasFlag('arturo_dead')).toBe(true);
    });

    it('heals saves made before the registry existed', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.register(flaggedMission('flag_carrier', 'carried_flag'));
        session.startMission('flag_carrier');
        session.travel('camp');

        const data = session.exportSave();
        delete (data as { flags?: string[] }).flags; // simulate an old save

        // Content registers its missions and then loads the progress
        // (the flag comes back from the mission snapshot).
        const restored = WorldSession.fromSave(data);
        restored.missions.register(flaggedMission('flag_carrier', 'carried_flag'));
        restored.missions.load(data.missions ?? []);
        for (const flag of restored.missions.allFlags()) restored.flags.set(flag);
        expect(restored.hasFlag('carried_flag')).toBe(true);
    });

    it('the story flag dictionary stays stable for old saves', () => {
        expect(FLAGS.EAST_FIELD_UNLOCKED).toBe('east_field_unlocked');
    });
});
