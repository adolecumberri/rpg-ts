import { WorldSession } from '../worldTest/core/session';

describe('save system', () => {
    it('round-trips the full session state', () => {
        const session = new WorldSession({ random: () => 0.5 });

        // mutate the world
        session.travel('forest');
        session.equipTo('rusty_sword', 'hero');
        const hero = session.team.getCharacter('hero')!;
        hero.experience.gain(30);
        hero.experience.gain(50); // level 2
        session.unlockNode('hero', 'warcry');
        const goblin = session.findNpc('goblin')!;
        goblin.character.stats.hp = 12; // damaged
        session.unlocked.add('east_unlocked');
        session.team.gold += 25;

        const restored = WorldSession.fromSave(session.exportSave());

        expect(restored.currentPlaceId).toBe('forest');
        expect(restored.team.gold).toBe(session.team.gold);
        expect(restored.unlocked.has('east_unlocked')).toBe(true);

        const restoredHero = restored.team.getCharacter('hero')!;
        expect(restoredHero.stats.attack).toBe(hero.stats.attack);
        expect(restoredHero.experience.level).toBe(hero.experience.level);
        expect(restoredHero.experience.currentXp).toBe(hero.experience.currentXp);
        expect(restoredHero.equipment.get('weapon')?.id).toBe('rusty_sword');
        expect(restored.skillTreeOf('hero')!.isLearned('warcry')).toBe(true);

        // inventory: 1 owned, 0 available because the sword is equipped
        const sword = restored.team.inventory.getItemSlotByItemId('rusty_sword')!;
        expect(sword.totalQuantity).toBe(1);
        expect(sword.quantity).toBe(0);

        // ember still has her fire sword equipped
        expect(restored.team.getCharacter('ember')!.equipment.get('weapon')?.id).toBe('fire_sword');
        expect(restored.team.inventory.getItemSlotByItemId('fire_sword')!.quantity).toBe(0);

        // npc state
        expect(restored.findNpc('goblin')!.character.stats.hp).toBe(12);
        expect(restored.findNpc('sage_spirit')).toBeDefined();

        expect(restored.victoriesAt('forest')).toBe(session.victoriesAt('forest'));
    });

    it('persists recruited and defeated npcs', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const aren = session.findNpc('north_resident')!;

        session.finishCombat('won', {
            npc: aren,
            placeId: 'north_town',
            kills: [{ enemyId: 'north_resident', killerId: 'hero' }],
        });
        expect(session.findNpc('north_resident')).toBeUndefined();

        const restored = WorldSession.fromSave(session.exportSave());

        expect(restored.findNpc('north_resident')).toBeUndefined();
        expect(restored.team.getCharacter('north_resident')).toBeDefined();
        expect(restored.team.getCharacter('north_resident')!.name).toBe('Aren');
    });

    it('persists a spawned special encounter and its one-shot flag', () => {
        const session = new WorldSession({ random: () => 0.5 });
        for (let i = 0; i < 3; i++) {
            session.finishCombat('won', { npc: session.findNpc('goblin')!, placeId: 'forest' });
        }
        expect(session.findNpc('goblin_chief')).toBeDefined();

        const restored = WorldSession.fromSave(session.exportSave());
        expect(restored.findNpc('goblin_chief')).toBeDefined();

        // the 'once' flag is persisted: no further chiefs after this one dies
        restored.finishCombat('won', { npc: restored.findNpc('goblin_chief')!, placeId: 'forest' });
        for (let i = 0; i < 5; i++) {
            restored.finishCombat('won', { npc: restored.findNpc('goblin')!, placeId: 'forest' });
        }
        expect(restored.findNpc('goblin_chief')).toBeUndefined();
    });

    it('rejects saves with an unknown version', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const data = session.exportSave();
        data.version = 999;

        expect(() => WorldSession.fromSave(data)).toThrow();
    });
});
