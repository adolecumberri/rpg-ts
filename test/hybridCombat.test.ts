import { Character, IntervalCombat, Stats } from '../src';
import { StatusInstance } from '../src/classes/StatusInstance';
import { WorldSession } from '../worldTest/core/session';
import { FIGHTS } from '../worldTest/core/config/fights';
import { bleedingStatus } from '../worldTest/core/statuses';
import { XP } from '../worldTest/core/xp/xpConfig';
import {
    HybridCombat,
    buildHybridCombat,
} from '../worldTest/core/combat/hybridCombat';
import type { HybridEvent } from '../worldTest/core/combat/hybridCombat';
import { winHayFieldBattles, winHayFight } from './support/hayField';

function character(id: string, stats: Partial<import('../src').Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

// Drives a hybrid battle to the end, answering every manual prompt with
// the first offered target (like an impatient player).
function driveToEnd(combat: HybridCombat): HybridEvent[] {
    const events: HybridEvent[] = [];
    for (let guard = 0; guard < 1000; guard++) {
        const event = combat.next();
        events.push(event);
        if (event.kind === 'end') return events;
        if (event.kind === 'manual') {
            const attack = combat.resolveManual(event.targets[0]);
            if (attack) events.push(attack);
        }
    }
    throw new Error('battle did not end within the guard');
}

describe('hybrid combat engine', () => {
    it('pauses for manual fighters and resolves their picked attack', () => {
        const player = character('player', { hp: 20, totalHp: 20, attack: 10, defence: 0, speed: 6 });
        const goblin = character('goblin', { hp: 100, totalHp: 100, attack: 1, defence: 0, speed: 1 });

        const combat = new HybridCombat([
            { character: player, interval: 2, side: 'left', manual: true },
            { character: goblin, interval: 24, side: 'right' },
        ], { random: () => 0.9 });

        // The player's tick arrives first and the engine waits.
        const first = combat.next();
        expect(first.kind).toBe('manual');
        if (first.kind !== 'manual') return;
        expect(first.actorId).toBe('player');
        expect(first.targets).toEqual(['goblin']);
        expect(goblin.stats.hp).toBe(100); // nothing happened yet

        const attack = combat.resolveManual('goblin');
        expect(attack?.kind).toBe('auto');
        if (attack?.kind !== 'auto') return;
        expect(attack.actorId).toBe('player');
        expect(attack.targetId).toBe('goblin');
        expect(attack.damage).toBe(10);
        expect(goblin.stats.hp).toBe(90);
    });

    it('automatic fighters attack without any prompt', () => {
        const farmer = character('farmer', { hp: 20, totalHp: 20, attack: 5, defence: 0, speed: 6 });
        const goblin = character('goblin', { hp: 100, totalHp: 100, attack: 1, defence: 0, speed: 1 });

        const combat = new HybridCombat([
            { character: farmer, interval: 2, side: 'left' },
            { character: goblin, interval: 24, side: 'right' },
        ], { random: () => 0.9 });

        const event = combat.next();
        expect(event.kind).toBe('auto');
        if (event.kind !== 'auto') return;
        expect(event.actorId).toBe('farmer');
        expect(event.targetId).toBe('goblin');
        expect(goblin.stats.hp).toBe(95);
    });

    it('fires after_attack and after_turn on both fighters after each attack', () => {
        const farmer = character('farmer', { hp: 20, totalHp: 20, attack: 10, defence: 0, speed: 6 });
        const goblin = character('goblin', { hp: 100, totalHp: 100, attack: 1, defence: 0, speed: 1 });
        goblin.statusManager.addStatusInstance(new StatusInstance({ definition: bleedingStatus() }));

        const combat = new HybridCombat([
            { character: farmer, interval: 2, side: 'left' },
            { character: goblin, interval: 24, side: 'right' },
        ], { random: () => 0.9 });

        const event = combat.next();
        if (event.kind !== 'auto') throw new Error('expected an auto attack');

        // 10 damage + 1 bleeding tick from the after_turn moment.
        expect(goblin.stats.hp).toBe(89);
    });

    it('ends with a winner once a side is wiped', () => {
        const hero = character('hero', { hp: 20, totalHp: 20, attack: 10, defence: 0, speed: 6 });
        const goblin = character('goblin', { hp: 15, totalHp: 15, attack: 1, defence: 0, speed: 1 });

        const combat = new HybridCombat([
            { character: hero, interval: 2, side: 'left', manual: true },
            { character: goblin, interval: 24, side: 'right' },
        ], { random: () => 0 });

        const events = driveToEnd(combat);
        const last = events[events.length - 1];
        expect(last.kind).toBe('end');
        if (last.kind !== 'end') return;
        expect(last.winner).toBe('left');
        expect(goblin.stats.hp).toBe(0);
    });
});

describe('buildHybridCombat', () => {
    it('pairs the manual player with the automatic roster farmers', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const setup = buildHybridCombat(session, FIGHTS.hay_goblins, { random: () => 0.5 });

        expect(setup.allies.map((ally) => ally.id)).toEqual(['player', 'arturo', 'farmer_0']);
        expect(setup.enemies.map((enemy) => enemy.id)).toEqual(['hay_goblin_a', 'hay_goblin_b', 'hay_goblin_c']);

        const combatants = setup.combat.allCombatants();
        const manualIds = combatants.filter((entry) => entry.manual).map((entry) => entry.character.id);
        expect(manualIds).toEqual(['player']);
        // The real roster characters fight, not clones.
        expect(setup.allies[1]).toBe(session.roster.character('arturo'));
    });

    it('the boss battle hands the player the lord\'s son with his fire breath', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const setup = buildHybridCombat(session, FIGHTS.hay_boss, { random: () => 0.9 });

        expect(setup.allies.map((ally) => ally.id)).toEqual(['lord_son']);
        expect(setup.enemies).toHaveLength(9); // the chief + 8 goblins

        const federico = setup.allies[0];
        expect(federico.getStat('hp')).toBe(130);
        expect(federico.getStat('attack')).toBe(28);
        expect(federico.getStat('defence')).toBe(10);

        const manual = setup.combat.allCombatants().find((entry) => entry.manual);
        expect(manual?.character.id).toBe('lord_son');
        // Fire Breath is locked behind the Gate affinity: the base kit
        // only carries the activation skill (fatigue is off, so Rest is
        // hidden from the default kit).
        expect((manual?.skills ?? []).map((spec) => spec.id)).toEqual(['defend', 'open_gate']);

        // The chief fights with its regeneration and berserk AI.
        const chief = setup.combat.allCombatants()
            .find((entry) => entry.character.id === 'hay_boss_goblin');
        expect((chief?.skills ?? []).map((spec) => spec.id)).toEqual([
            'defend', 'boss_regen', 'boss_berserk',
        ]);
        // The player's own party stays out of the battle.
        expect(setup.allies.some((ally) => ally.id === 'player')).toBe(false);
    });
});

describe('the hay field story battles', () => {
    it('the first fight grants XP to the farmers without ending the mission', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.inventory.addItem(session.itemTable.createItem('sickle'));
        session.startMission('sickles_to_hay');
        session.travel('hay_field');
        session.consumePendingBattle();
        session.messages.clear(); // the thanks lines were read
        expect(session.npcsAt('hay_field').map((npc) => npc.id)).toEqual([
            'lord_son', 'arturo', 'farmer_0', 'farmer_1', 'farmer_2', 'farmer_3',
        ]);

        // Fight it to the end with deterministic randomness (0.5: no
        // crits, no misses even with the fatigue accuracy penalty).
        const setup = buildHybridCombat(session, FIGHTS.hay_goblins, { random: () => 0.5 });
        const kills: { enemyId: string; killerId: string }[] = [];
        const events = driveToEnd(setup.combat);
        for (const event of events) {
            if (event.kind === 'auto' && !event.targetAlive) {
                kills.push({ enemyId: event.targetId, killerId: event.actorId });
            }
        }
        expect(kills).toHaveLength(3);

        const fighters = setup.allies.filter((ally) => !session.team.getCharacter(ally.id));
        const end = session.finishCombat('won', {
            placeId: 'hay_field',
            fightId: 'hay_goblins',
            missionId: 'sickles_to_hay',
            kills,
            fighters,
            participants: setup.allies,
        });

        // The mission is NOT over: the rally beat is queued.
        expect(session.missionIsComplete('sickles_to_hay')).toBe(false);
        expect(session.missionIsActive('sickles_to_hay')).toBe(true);
        expect(session.pendingBattle()).toEqual({
            fightId: 'hay_goblins_2',
            placeId: 'hay_field',
            missionId: 'sickles_to_hay',
        });
        expect(session.messages.peek()?.text).toBe('More of them are coming from the field!');
        session.messages.next();
        expect(session.messages.peek()?.text).toContain('UNITE');

        // Everyone earned XP: 3 kills -> killer XP + assist XP.
        const playerXp = session.team.getCharacter('player')!.experience.currentXp;
        const arturoXp = session.roster.character('arturo')!.experience.currentXp;
        const farmerXp = session.roster.character('farmer_0')!.experience.currentXp;
        expect(playerXp + arturoXp + farmerXp).toBe(3 * XP.kill + 6 * XP.assist);
        expect(arturoXp).toBeGreaterThan(0);
        expect(farmerXp).toBeGreaterThan(0);
        expect(end.message).toContain('Victory');
    });

    it('the full chain completes the mission and sends everyone home', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.inventory.addItem(session.itemTable.createItem('sickle'));
        session.startMission('sickles_to_hay');
        session.travel('hay_field');

        winHayFieldBattles(session);

        expect(session.missionIsComplete('sickles_to_hay')).toBe(true);
        expect(session.hasFlag('sickles_delivered')).toBe(true);
        // The people that travelled with the mission returned home.
        expect(session.npcsAt('hay_field')).toEqual([]);
        for (const id of ['lord_son', 'arturo', 'farmer_0', 'farmer_1', 'farmer_2', 'farmer_3']) {
            expect(session.npcsAt('farm').map((npc) => npc.id)).toContain(id);
        }
        // Federico fought the chief personally: the battle hurt him.
        expect(session.findNpc('lord_son')!.character.stats.hp).toBeLessThan(130);
    });

    it('the boss battle grants XP only to the lord\'s son', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.inventory.addItem(session.itemTable.createItem('sickle'));
        session.startMission('sickles_to_hay');
        session.travel('hay_field');
        session.consumePendingBattle();
        session.messages.clear();

        winHayFight(session, 'hay_goblins');
        session.consumePendingBattle();
        session.messages.clear();
        winHayFight(session, 'hay_goblins_2');
        session.consumePendingBattle();
        session.messages.clear();

        // The player's party sits the boss battle out (Federico fights),
        // so the player must not earn anything from it.
        const playerXpBefore = session.team.getCharacter('player')!.experience.currentXp;
        const end = winHayFight(session, 'hay_boss', true);

        const federico = session.findNpc('lord_son')!.character;
        expect(federico.experience.currentXp).toBe(90); // 9 kills × 10, no assists
        expect(session.team.getCharacter('player')!.experience.currentXp).toBe(playerXpBefore);
        // The message matches what Federico actually earned: no hidden
        // assistant XP is summed into it.
        expect(end.message).toContain('90 XP total');
    });

    it('persists the farmers\' battle damage and XP in the save', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.inventory.addItem(session.itemTable.createItem('sickle'));
        session.startMission('sickles_to_hay');
        session.travel('hay_field');
        session.consumePendingBattle();

        const setup = buildHybridCombat(session, FIGHTS.hay_goblins, { random: () => 0.5 });
        const kills: { enemyId: string; killerId: string }[] = [];
        const events = driveToEnd(setup.combat);
        for (const event of events) {
            if (event.kind === 'auto' && !event.targetAlive) {
                kills.push({ enemyId: event.targetId, killerId: event.actorId });
            }
        }
        const fighters = setup.allies.filter((ally) => !session.team.getCharacter(ally.id));
        session.finishCombat('won', {
            placeId: 'hay_field',
            fightId: 'hay_goblins',
            missionId: 'sickles_to_hay',
            kills,
            fighters,
            participants: setup.allies,
        });

        const arturoBefore = session.roster.character('arturo')!;
        const farmerBefore = session.roster.character('farmer_0')!;
        // The goblins (random 0.5) focus Arturo during the skirmish.
        expect(arturoBefore.stats.hp).toBeLessThan(arturoBefore.stats.totalHp);

        const restored = WorldSession.fromSave(session.exportSave());
        const arturo = restored.roster.character('arturo')!;
        const farmer = restored.roster.character('farmer_0')!;
        expect(arturo.experience.currentXp).toBe(arturoBefore.experience.currentXp);
        expect(farmer.experience.currentXp).toBe(farmerBefore.experience.currentXp);
        expect(arturo.stats.hp).toBe(arturoBefore.stats.hp);

        // The world npc and the roster entry stay the same character, so
        // the dev page shows the real battle state after a load too.
        const farmNpc = restored.findNpc('farmer_0')!; // at the hay field, mid-mission
        expect(farmNpc.character).toBe(farmer);
        expect(farmNpc.character.experience.currentXp).toBe(farmerBefore.experience.currentXp);
        expect(farmNpc.character.stats.fatigue).toBe(farmerBefore.stats.fatigue);
    });

    it('fleeing the battle fails the mission and moves the people back', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.team.inventory.addItem(session.itemTable.createItem('sickle'));
        session.startMission('sickles_to_hay');
        session.travel('hay_field');
        session.consumePendingBattle();

        const setup = buildHybridCombat(session, FIGHTS.hay_goblins, { random: () => 0.9 });
        const fighters = setup.allies.filter((ally) => !session.team.getCharacter(ally.id));
        const end = session.finishCombat('fled', {
            placeId: 'hay_field',
            fightId: 'hay_goblins',
            missionId: 'sickles_to_hay',
            fighters,
        });

        expect(end.message).toContain('Mission failed');
        expect(session.npcsAt('hay_field')).toEqual([]);
        expect(session.npcsAt('farm').map((npc) => npc.id)).toContain('lord_son');
    });
});

describe('interval engine status moments', () => {
    it('ticks after_turn statuses after each interval attack', () => {
        const hero = new Character({
            id: 'hero',
            name: 'hero',
            stats: new Stats({ hp: 100, totalHp: 100, attack: 10, defence: 0 }),
        });
        const dummy = new Character({
            id: 'dummy',
            name: 'dummy',
            stats: new Stats({ hp: 1000, totalHp: 1000, attack: 0, defence: 0 }),
        });
        dummy.statusManager.addStatusInstance(new StatusInstance({ definition: bleedingStatus() }));

        const result = new IntervalCombat({ maxTicks: 3, randomTarget: false }).resolve(
            [{ character: hero, interval: 3 }],
            [{ character: dummy, interval: 100 }],
        );

        expect(result.turns).toHaveLength(1);
        // 10 attack damage + 1 bleeding tick from after_turn.
        expect(result.turns[0].damageApplied).toBe(10);
        expect(dummy.stats.hp).toBe(989);
    });
});
