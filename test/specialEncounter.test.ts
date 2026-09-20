import { EncounterTracker } from '../worldTest/core/encounters/encounterTracker';
import { buildSpecialNpc } from '../worldTest/core/encounters/specialEncounter';

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

describe('special encounter builder', () => {
    it('builds an npc from a special encounter definition', () => {
        const npc = buildSpecialNpc({
            id: 'chief',
            placeId: 'forest',
            triggerAfter: 3,
            repeat: 'once',
            name: 'Chief',
            stats: { hp: 60, totalHp: 60, attack: 9, defence: 2 },
            talk: '"..."',
            xpReward: 60,
            goldReward: 30,
        });

        expect(npc.id).toBe('chief');
        expect(npc.character.name).toBe('Chief');
        expect(npc.character.stats.attack).toBe(9);
        expect(npc.xpReward).toBe(60);
    });
});
