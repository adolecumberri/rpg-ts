import { WorldSession } from '../worldTest/core/session';

describe('npc persistence', () => {
    it('keeps an npc\'s level, xp and evolved stats across a save', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const npc = session.findNpc('general')!;
        expect(npc).toBeDefined();

        // The general grew between fights: the rematch must face the
        // same opponent, not a content-fresh copy.
        npc.character.stats.attack = 22;
        npc.character.stats.speed = 9;
        npc.character.stats.hp = 37;
        npc.character.stats.isAlive = 1;
        npc.character.experience.level = 4;
        npc.character.experience.currentXp = 123;

        const restored = WorldSession.fromSave(session.exportSave());
        const same = restored.findNpc('general')!;

        expect(same.character.stats.attack).toBe(22);
        expect(same.character.stats.speed).toBe(9);
        expect(same.character.stats.hp).toBe(37);
        expect(same.character.experience.level).toBe(4);
        expect(same.character.experience.currentXp).toBe(123);
    });
});
