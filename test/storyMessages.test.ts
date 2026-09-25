import { WorldSession } from '../worldTest/core/session';
import { MessageQueue } from '../worldTest/core/messages';
import { CHATS } from '../worldTest/core/config/chats';
import { FIGHTS } from '../worldTest/core/config/fights';
import { characterGenerator } from '../worldTest/core/generators/characterGenerator';
import { PLACES_BY_ID } from '../worldTest/core/world';
import { winHayFieldBattles } from './support/hayField';

// The sickles mission requires a sickle: grant it before accepting.
function giveSickle(session: WorldSession): void {
    session.team.inventory.addItem(session.itemTable.createItem('sickle'));
}

describe('global message queue', () => {
    it('peeks and advances lines one at a time', () => {
        const queue = new MessageQueue();
        expect(queue.hasPending()).toBe(false);
        expect(queue.peek()).toBeUndefined();

        queue.push([{ speaker: 'A', text: 'one' }, { text: 'two' }]);
        expect(queue.hasPending()).toBe(true);
        expect(queue.peek()).toEqual({ speaker: 'A', text: 'one' });

        queue.next();
        expect(queue.peek()).toEqual({ text: 'two' });
        queue.next();
        expect(queue.peek()).toBeUndefined();
        expect(queue.hasPending()).toBe(false);
    });

    it('clears all pending lines', () => {
        const queue = new MessageQueue();
        queue.push([{ text: 'a' }, { text: 'b' }]);
        queue.clear();
        expect(queue.hasPending()).toBe(false);
    });
});

describe('character generator', () => {
    it('builds a goblin from its preset, scaling stats by level', () => {
        const level1 = characterGenerator('goblin', 1, { id: 'goblin_a' });
        expect(level1.name).toBe('Goblin');
        expect(level1.stats.hp).toBe(10);
        expect(level1.stats.attack).toBe(2);
        expect(level1.speciesId).toBe('goblin'); // reference to the generic preset

        const level3 = characterGenerator('goblin', 3, { id: 'goblin_b' });
        expect(level3.stats.hp).toBe(14); // 10 + 2*2
        expect(level3.stats.attack).toBe(4); // 2 + 1*2
    });

    it('accepts stat overrides and custom names', () => {
        const boss = characterGenerator('goblin', 1, { id: 'boss', name: 'Goblin Boss', stats: { hp: 30, attack: 6 } });
        expect(boss.name).toBe('Goblin Boss');
        expect(boss.stats.hp).toBe(30);
        expect(boss.stats.attack).toBe(6);
    });

    it('rejects unknown species', () => {
        expect(() => characterGenerator('dragon', 1)).toThrow('Unknown species: dragon');
    });
});

describe('fights as constants', () => {
    it('the hay field story defines its three battles', () => {
        const first = FIGHTS.hay_goblins;
        expect(first.mode).toBe('hybrid');
        expect(first.placeId).toBe('hay_field');
        expect(first.enemies().map((character) => character.id)).toEqual([
            'hay_goblin_a', 'hay_goblin_b', 'hay_goblin_c',
        ]);
        // Two farmers fight the first skirmish automatically.
        expect(first.allyIds).toEqual(['arturo', 'farmer_0']);

        const second = FIGHTS.hay_goblins_2;
        expect(second.enemies()).toHaveLength(9);
        expect(second.allyIds).toEqual(['arturo', 'farmer_0', 'farmer_1', 'farmer_2', 'farmer_3']);

        const boss = FIGHTS.hay_boss;
        expect(boss.manualId).toBe('lord_son');
        expect(boss.enemies()).toHaveLength(9); // the chief + 8 goblins
        const chief = boss.enemies()[0];
        expect(chief.name).toBe('Goblin Chief');
        expect(chief.stats.hp).toBe(220);
        expect(chief.stats.attack).toBe(12);
        expect(chief.stats.defence).toBe(6);
    });

    it('fleeing its battle fails the mission that triggered it', () => {
        const fight = FIGHTS.hay_goblins;
        const session = new WorldSession({ random: () => 0.5 });
        const runner = session.missions.start('sickles_to_hay')!;

        fight.onFlee?.(runner);
        expect(runner.isFailed()).toBe(true);
    });

    it('the dev training dummy is a damage sponge that never fights back', () => {
        const fight = FIGHTS.dev_dummy;
        expect(fight.mode).toBe('turn');
        const dummy = fight.enemies()[0];
        expect(dummy.id).toBe('training_dummy');
        expect(dummy.name).toBe('Training Dummy');
        expect(dummy.stats.hp).toBe(1000);
        expect(dummy.getStat('attack')).toBe(0);
        expect(dummy.getStat('speed')).toBe(1);
    });
});

describe('arrival events', () => {
    it('plays the hay field chat only while the sickles mission is active', () => {
        const session = new WorldSession({ random: () => 0.5 });

        session.missions.start('sickles_to_hay');
        const arrival = session.travel('hay_field');

        expect(arrival.ok).toBe(true);
        expect(arrival.arrival).toBe(true);
        expect(session.messages.peek()?.speaker).toBe(CHATS.hay_thanks.lines[0].speaker);
        session.messages.next();
        expect(session.messages.peek()?.speaker).toBe(CHATS.hay_thanks.lines[1].speaker);
        session.messages.next();
        expect(session.messages.hasPending()).toBe(false);
    });

    it('queues the goblin fight with its mission and consumes it once', () => {
        const session = new WorldSession({ random: () => 0.5 });

        session.missions.start('sickles_to_hay');
        expect(session.pendingBattle()).toBeNull();

        session.travel('hay_field');
        expect(session.pendingBattle()).toEqual({
            fightId: 'hay_goblins',
            placeId: 'hay_field',
            missionId: 'sickles_to_hay',
        });

        expect(session.consumePendingBattle()).toEqual({
            fightId: 'hay_goblins',
            placeId: 'hay_field',
            missionId: 'sickles_to_hay',
        });
        expect(session.consumePendingBattle()).toBeNull();
        expect(session.pendingBattle()).toBeNull();
    });

    it('closes the hay field road once the mission is complete', () => {
        const session = new WorldSession({ random: () => 0.5 });

        session.missions.start('sickles_to_hay');
        session.travel('hay_field');
        session.messages.clear();
        winHayFieldBattles(session);

        // the way home stays open, the road out closes again
        expect(session.travel('farm').ok).toBe(true);
        const again = session.travel('hay_field');
        expect(again.ok).toBe(false);
        expect(session.messages.hasPending()).toBe(false);
        expect(session.pendingBattle()).toBeNull();
    });

    it('moves the lord son, Arturo and four farmers to the hay field when accepted, and back on cancel', () => {
        const session = new WorldSession({ random: () => 0.5 });

        expect(session.npcsAt('hay_field')).toEqual([]);

        giveSickle(session);
        session.startMission('sickles_to_hay');
        const atHay = session.npcsAt('hay_field').map((npc) => npc.id);
        expect(atHay).toEqual(['lord_son', 'arturo', 'farmer_0', 'farmer_1', 'farmer_2', 'farmer_3']);
        expect(session.findNpc('lord_son')).toBeDefined();

        session.cancelMission('sickles_to_hay');
        expect(session.npcsAt('hay_field')).toEqual([]);
        // Declining (cancelling) sends EVERYONE back to the farm: the
        // lord's son and the five farmers that travelled as a group.
        for (const id of ['lord_son', 'arturo', 'farmer_0', 'farmer_1', 'farmer_2', 'farmer_3']) {
            expect(session.npcsAt('farm').map((npc) => npc.id)).toContain(id);
        }
        expect(session.pendingBattle()).toBeNull();
    });

    it('keeps the mission npc moves across a save and load', () => {
        const session = new WorldSession({ random: () => 0.5 });
        giveSickle(session);
        session.startMission('sickles_to_hay');

        const restored = WorldSession.fromSave(session.exportSave());
        const atHay = restored.npcsAt('hay_field').map((npc) => npc.id);
        expect(atHay).toEqual(['lord_son', 'arturo', 'farmer_0', 'farmer_1', 'farmer_2', 'farmer_3']);
        expect(restored.missionIsActive('sickles_to_hay')).toBe(true);
    });

    it('failing the fight moves the mission people back to the farm', () => {
        const session = new WorldSession({ random: () => 0.5 });
        giveSickle(session);
        session.startMission('sickles_to_hay');
        session.travel('hay_field');
        session.consumePendingBattle();

        const end = session.finishCombat('fled', { placeId: 'hay_field', fightId: 'hay_goblins', missionId: 'sickles_to_hay' });
        expect(end.message).toContain('Mission failed: Sickles to the Hay Field');
        expect(session.npcsAt('hay_field')).toEqual([]);
        expect(session.npcsAt('farm').map((npc) => npc.id)).toContain('lord_son');

        // A failed mission returns to the available board: there is no
        // failed status to keep around.
        expect(session.missions.availableMissions('farm').map((mission) => mission.id)).toEqual([
            'sickles_to_hay',
        ]);
        expect(session.missionIsActive('sickles_to_hay')).toBe(false);
        expect(session.startMission('sickles_to_hay')).toBe(true);
        expect(session.missions.activeMissions().map((runner) => runner.missionId())).toEqual([
            'sickles_to_hay',
        ]);
    });

    it('goblins carry their sticks and the farmhands wear their sickles', () => {
        const session = new WorldSession({ random: () => 0.5 });

        const goblin = characterGenerator('goblin', 1, { id: 'goblin_gear' });
        expect(goblin.equipment.get('weapon')?.id).toBe('stick');
        expect(goblin.stats.attack).toBe(2); // raw preset unchanged
        expect(goblin.getStat('attack')).toBe(3); // +1 from the stick

        const arturo = session.roster.character('arturo')!;
        expect(arturo.equipment.get('weapon')?.id).toBe('sickle');
        expect(arturo.getStat('attack')).toBe(8); // 4 base + sickle

        const farmhand = session.roster.character('farmer_3')!;
        expect(farmhand.equipment.get('weapon')?.id).toBe('sickle');
        expect(farmhand.getStat('attack')).toBe(8);

        // The player starts with sack + outfit, no weapon.
        expect(session.team.getCharacter('player')!.equipment.get('weapon')).toBeUndefined();
    });
});

describe('place declarations', () => {
    it('declares the hay field as a story place with chat and fight', () => {
        const place = PLACES_BY_ID['hay_field'];
        expect(place.menu).toBe(false);
        expect(place.arrival?.missionId).toBe('sickles_to_hay');
        expect(place.arrival?.chatId).toBe('hay_thanks');
        expect(place.arrival?.fightId).toBe('hay_goblins');
    });
});
