import { EncounterTracker } from '../worldTest/core/encounters/encounterTracker';
import { WorldSession } from '../worldTest/core/session';

describe('encounter tracker', () => {
    it('counts victories per place', () => {
        const tracker = new EncounterTracker();
        tracker.recordVictory('forest');
        tracker.recordVictory('forest');
        tracker.recordVictory('training');

        expect(tracker.victoriesAt('forest')).toBe(2);
        expect(tracker.victoriesAt('training')).toBe(1);
        expect(tracker.victoriesAt('cave')).toBe(0);
    });

    it('can reset a place and everything', () => {
        const tracker = new EncounterTracker();
        tracker.recordVictory('forest');
        tracker.recordVictory('cave');

        tracker.reset('forest');
        expect(tracker.victoriesAt('forest')).toBe(0);
        expect(tracker.victoriesAt('cave')).toBe(1);

        tracker.resetAll();
        expect(tracker.victoriesAt('cave')).toBe(0);
    });
});

describe('special encounters', () => {
    it('respawns grunt npcs so fights can repeat', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const goblin = session.findNpc('goblin')!;
        goblin.character.stats.hp = 5;

        session.finishCombat('won', { npc: goblin, placeId: 'forest' });

        const respawned = session.findNpc('goblin')!;
        expect(respawned).toBeDefined();
        expect(respawned.character.stats.hp).toBe(respawned.character.stats.totalHp);
        expect(respawned.character.stats.isAlive).toBe(1);
    });

    it('does not spawn the special before the threshold', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.finishCombat('won', { npc: session.findNpc('goblin')!, placeId: 'forest' });
        session.finishCombat('won', { npc: session.findNpc('goblin')!, placeId: 'forest' });

        expect(session.findNpc('goblin_chief')).toBeUndefined();
        expect(session.victoriesAt('forest')).toBe(2);
    });

    it('spawns the Goblin Chief after 3 forest victories and only once', () => {
        const session = new WorldSession({ random: () => 0.5 });

        let lastResult;
        for (let i = 0; i < 3; i++) {
            lastResult = session.finishCombat('won', { npc: session.findNpc('goblin')!, placeId: 'forest' });
        }

        expect(lastResult.specialSpawn?.id).toBe('goblin_chief');
        const chief = session.findNpc('goblin_chief');
        expect(chief).toBeDefined();
        expect(chief!.character.stats.attack).toBe(9);

        // defeating the chief removes it and it never comes back ('once')
        session.finishCombat('won', { npc: chief!, placeId: 'forest' });
        expect(session.findNpc('goblin_chief')).toBeUndefined();

        session.finishCombat('won', { npc: session.findNpc('goblin')!, placeId: 'forest' });
        session.finishCombat('won', { npc: session.findNpc('goblin')!, placeId: 'forest' });
        session.finishCombat('won', { npc: session.findNpc('goblin')!, placeId: 'forest' });
        expect(session.findNpc('goblin_chief')).toBeUndefined();
    });

    it('spawns the Arena Champion every 2 training victories', () => {
        const session = new WorldSession({ random: () => 0.5 });

        // victories 1, 2 -> champion appears
        session.finishCombat('won', { placeId: 'training' });
        const first = session.finishCombat('won', { placeId: 'training' });
        expect(first.specialSpawn?.id).toBe('arena_champion');
        expect(session.findNpc('arena_champion')).toBeDefined();

        // victories 3, 4 with the champion still standing -> no duplicates
        const third = session.finishCombat('won', { placeId: 'training' });
        const fourth = session.finishCombat('won', { placeId: 'training' });
        expect(third.specialSpawn).toBeNull();
        expect(fourth.specialSpawn).toBeNull();

        // defeating the champion on a non-threshold victory removes it
        session.finishCombat('won', { npc: session.findNpc('arena_champion')!, placeId: 'training' });
        expect(session.findNpc('arena_champion')).toBeUndefined();

        // the next threshold victory spawns a new one ('every')
        const again = session.finishCombat('won', { placeId: 'training' });
        expect(again.specialSpawn?.id).toBe('arena_champion');
        expect(session.findNpc('arena_champion')).toBeDefined();
    });
});
