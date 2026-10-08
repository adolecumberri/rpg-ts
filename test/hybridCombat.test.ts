import { Character, IntervalCombat, Stats } from '../src';
import { StatusInstance } from '../src/classes/StatusInstance';
import { WorldSession } from '../worldTest/core/session';
import { FIGHTS } from '../worldTest/core/config/fights';
import type { FightDefinition } from '../worldTest/core/config/fights';
import { FLAGS } from '../worldTest/core/constants/flags';
import { characterGenerator } from '../worldTest/core/generators/characterGenerator';
import { Creatures } from '../worldTest/core/constants/creatures';
import type { Mission } from '../worldTest/core/missions/mission';
import { bleedingStatus } from '../worldTest/core/statuses';
import { XP } from '../worldTest/core/xp/xpConfig';
import {
    HybridCombat,
    buildHybridCombat,
} from '../worldTest/core/combat/hybridCombat';
import type { HybridEvent } from '../worldTest/core/combat/hybridCombat';

function character(id: string, stats: Partial<import('../src').Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

function goblin(id: string): Character {
    return characterGenerator({ creature: Creatures.goblin, level: 1, id });
}

// The local battle chain the settlement tests run: the content fights
// were removed, these fixtures exercise the same machinery (hybrid
// battles, mission beats, XP and flee hooks) through the FIGHTS
// registry, exactly like the content fights used to.
const TEST_FIGHTS: Record<string, FightDefinition> = {
    goblin_skirmish: {
        id: 'goblin_skirmish',
        mode: 'hybrid',
        placeId: 'hay_field',
        enemies: () => [goblin('goblin_a'), goblin('goblin_b'), goblin('goblin_c')],
        allyIds: ['arturo', 'soldier_0'],
        onFlee: (mission) => mission?.fail(),
    },
    goblin_rally: {
        id: 'goblin_rally',
        mode: 'hybrid',
        placeId: 'hay_field',
        enemies: () => [goblin('goblin_d'), goblin('goblin_e'), goblin('goblin_f')],
        allyIds: ['arturo', 'soldier_0'],
        onFlee: (mission) => mission?.fail(),
    },
    goblin_chief: {
        id: 'goblin_chief',
        mode: 'hybrid',
        placeId: 'hay_field',
        manualId: 'lord_son',
        enemies: () => [
            characterGenerator({
                creature: Creatures.goblin,
                level: 1,
                id: 'goblin_chief',
                name: 'Goblin Chief',
                stats: { hp: 40, attack: 20 },
                skills: ['boss_regen', 'boss_berserk'],
            }),
            goblin('goblin_1'),
            goblin('goblin_2'),
            goblin('goblin_3'),
            goblin('goblin_4'),
            goblin('goblin_5'),
            goblin('goblin_6'),
            goblin('goblin_7'),
            goblin('goblin_8'),
        ],
    },
};
Object.assign(FIGHTS, TEST_FIGHTS);

// The mission that owns the chain: the opening dialogue queues the
// skirmish battle, every victory queues the next beat, and the last
// one completes the mission. The lord's son and two Order recruits
// travel with it and return home when it ends.
const BATTLE_CHAIN: Mission = {
    id: 'test_battle_chain',
    title: 'Goblin Chain',
    steps: [
        {
            id: 'open',
            kind: 'dialogue',
            lines: [{ speaker: 'General', text: 'Goblins hold the hay field.' }],
            battle: { fightId: 'goblin_skirmish', placeId: 'hay_field' },
        },
        {
            id: 'skirmish',
            kind: 'wait_battle',
            completeOn: ['won'],
            battle: { fightId: 'goblin_skirmish', placeId: 'hay_field' },
        },
        {
            id: 'rally',
            kind: 'dialogue',
            lines: [
                { speaker: 'Arturo', text: 'More of them are coming from the field!' },
                { speaker: 'General', text: 'UNITE!' },
            ],
            battle: { fightId: 'goblin_rally', placeId: 'hay_field' },
        },
        {
            id: 'rally_battle',
            kind: 'wait_battle',
            completeOn: ['won'],
            battle: { fightId: 'goblin_rally', placeId: 'hay_field' },
        },
        {
            id: 'boss_call',
            kind: 'dialogue',
            lines: [{ speaker: 'Federico', text: 'The chief shows itself!' }],
            battle: { fightId: 'goblin_chief', placeId: 'hay_field' },
        },
        {
            id: 'boss_battle',
            kind: 'wait_battle',
            completeOn: ['won'],
            battle: { fightId: 'goblin_chief', placeId: 'hay_field' },
        },
        { id: 'reward', kind: 'reward', flags: ['chain_done'] },
    ],
    npcMoves: [
        { npcId: 'lord_son', fromPlaceId: 'farm', toPlaceId: 'hay_field' },
        { npcId: 'arturo', fromPlaceId: 'camp', toPlaceId: 'hay_field' },
        { npcId: 'soldier_0', fromPlaceId: 'camp', toPlaceId: 'hay_field' },
    ],
};

// Drives a hybrid battle to the end, answering every manual prompt with
// the first offered target (like an impatient player). With
// preferSkills the player casts instead: the boss battle awakens the
// Gate affinity first, then keeps breathing fire.
function driveToEnd(combat: HybridCombat, preferSkills = false): HybridEvent[] {
    const events: HybridEvent[] = [];
    for (let guard = 0; guard < 4000; guard++) {
        const event = combat.next();
        events.push(event);
        if (event.kind === 'end') return events;
        if (event.kind === 'manual') {
            if (preferSkills && event.skills && event.skills.length > 0) {
                const preferred = event.skills.indexOf('fire_breath') !== -1 ?
                    'fire_breath' :
                    event.skills.indexOf('open_gate') !== -1 ?
                        'open_gate' :
                        event.skills[0];
                const cast = combat.resolveManualSkill(preferred);
                if (cast) events.push(cast);
                continue;
            }
            const attack = combat.resolveManual(event.targets[0]);
            if (attack) events.push(attack);
        }
    }
    throw new Error('battle did not end within the guard');
}

// Every enemy kill the events recorded, for the battle-end settlement.
function collectKills(events: HybridEvent[], enemyIds: Set<string>): { enemyId: string; killerId: string }[] {
    const kills: { enemyId: string; killerId: string }[] = [];
    for (const event of events) {
        if (event.kind !== 'auto') continue;
        if (event.kills && event.kills.length > 0) {
            for (const kill of event.kills) {
                if (enemyIds.has(kill.targetId)) {
                    kills.push({ enemyId: kill.targetId, killerId: kill.killerId });
                }
            }
        } else if (!event.targetAlive && enemyIds.has(event.targetId)) {
            kills.push({ enemyId: event.targetId, killerId: event.actorId });
        }
    }
    return kills;
}

// Runs the pending battle of the chain to the end and settles it as a
// victory (the story lines between beats are read by clearing them).
function winChainFight(
    session: WorldSession,
    fightId: string,
    preferSkills = false,
): ReturnType<WorldSession['finishCombat']> {
    const pending = session.consumePendingBattle();
    session.messages.clear();
    const setup = buildHybridCombat(session, FIGHTS[fightId], { random: () => 0.5 });
    const enemyIds = new Set(setup.enemies.map((enemy) => enemy.id));
    const kills = collectKills(driveToEnd(setup.combat, preferSkills), enemyIds);
    const fighters = setup.allies.filter((ally) => !session.team.getCharacter(ally.id));
    return session.finishCombat('won', {
        placeId: pending?.placeId ?? 'hay_field',
        fightId,
        missionId: pending?.missionId ?? 'test_battle_chain',
        kills,
        fighters,
        participants: setup.allies,
    });
}

/** Wins the whole chain: the skirmish, the rally and the chief. */
function winChainBattles(session: WorldSession): void {
    winChainFight(session, 'goblin_skirmish');
    winChainFight(session, 'goblin_rally');
    winChainFight(session, 'goblin_chief', true);
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
    it('pairs the manual player with the automatic recruits', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const setup = buildHybridCombat(session, FIGHTS.goblin_skirmish, { random: () => 0.5 });

        expect(setup.allies.map((ally) => ally.id)).toEqual(['player', 'arturo', 'soldier_0']);
        expect(setup.enemies.map((enemy) => enemy.id)).toEqual(['goblin_a', 'goblin_b', 'goblin_c']);

        const combatants = setup.combat.allCombatants();
        const manualIds = combatants.filter((entry) => entry.manual).map((entry) => entry.character.id);
        expect(manualIds).toEqual(['player']);
        // The real roster characters fight, not clones.
        expect(setup.allies[1]).toBe(session.roster.character('arturo'));
    });

    it('the boss battle hands the player the lord\'s son with his fire breath', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const setup = buildHybridCombat(session, FIGHTS.goblin_chief, { random: () => 0.9 });

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
            .find((entry) => entry.character.id === 'goblin_chief');
        expect((chief?.skills ?? []).map((spec) => spec.id)).toEqual([
            'defend', 'boss_regen', 'boss_berserk',
        ]);
        // The player's own party stays out of the battle.
        expect(setup.allies.some((ally) => ally.id === 'player')).toBe(false);
    });
});

describe('the battle chain through the session', () => {
    it('the first fight grants XP to the recruits without ending the mission', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.unlocked.add(FLAGS.HAY_FIELD_UNLOCKED); // the hay field is locked by default
        session.missions.register(BATTLE_CHAIN);
        session.startMission('test_battle_chain');
        session.messages.clear(); // the opening lines were read
        session.travel('hay_field');
        expect(session.npcsAt('hay_field').map((npc) => npc.id)).toEqual([
            'lord_son', 'arturo', 'soldier_0',
        ]);
        expect(session.pendingBattle()).toEqual({
            fightId: 'goblin_skirmish',
            placeId: 'hay_field',
            missionId: 'test_battle_chain',
        });

        // Fight it to the end with deterministic randomness (0.5: no
        // crits, no misses).
        const setup = buildHybridCombat(session, FIGHTS.goblin_skirmish, { random: () => 0.5 });
        const enemyIds = new Set(setup.enemies.map((enemy) => enemy.id));
        const kills = collectKills(driveToEnd(setup.combat), enemyIds);
        expect(kills).toHaveLength(3);

        const fighters = setup.allies.filter((ally) => !session.team.getCharacter(ally.id));
        const end = session.finishCombat('won', {
            placeId: 'hay_field',
            fightId: 'goblin_skirmish',
            missionId: 'test_battle_chain',
            kills,
            fighters,
            participants: setup.allies,
        });

        // The mission is NOT over: the rally beat is queued.
        expect(session.missionIsComplete('test_battle_chain')).toBe(false);
        expect(session.missionIsActive('test_battle_chain')).toBe(true);
        expect(session.pendingBattle()).toEqual({
            fightId: 'goblin_rally',
            placeId: 'hay_field',
            missionId: 'test_battle_chain',
        });
        expect(session.messages.peek()?.text).toBe('More of them are coming from the field!');
        session.messages.next();
        expect(session.messages.peek()?.text).toContain('UNITE');

        // The fighters earned XP: killers and assists. Arturo may fall
        // in the skirmish (he gets nothing if he never lands a kill).
        const playerXp = session.team.getCharacter('player')!.experience.currentXp;
        const arturoXp = session.roster.character('arturo')!.experience.currentXp;
        const soldierXp = session.roster.character('soldier_0')!.experience.currentXp;
        expect(soldierXp).toBeGreaterThan(0);
        expect(playerXp + arturoXp + soldierXp).toBeGreaterThanOrEqual(3 * XP.kill);
        expect(end.message).toContain('Victory');
    });

    it('the full chain completes the mission and sends everyone home', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.unlocked.add(FLAGS.HAY_FIELD_UNLOCKED); // the hay field is locked by default
        session.missions.register(BATTLE_CHAIN);
        session.startMission('test_battle_chain');
        session.messages.clear();
        session.travel('hay_field');

        winChainBattles(session);

        expect(session.missionIsComplete('test_battle_chain')).toBe(true);
        expect(session.hasFlag('chain_done')).toBe(true);
        // The people that travelled with the mission returned home.
        expect(session.npcsAt('hay_field')).toEqual([]);
        expect(session.npcsAt('farm').map((npc) => npc.id)).toContain('lord_son');
        expect(session.npcsAt('camp').map((npc) => npc.id)).toContain('arturo');
        expect(session.npcsAt('camp').map((npc) => npc.id)).toContain('soldier_0');
        // Federico fought the chief personally: the battle hurt him.
        expect(session.findNpc('lord_son')!.character.stats.hp).toBeLessThan(130);
    });

    it('the boss battle grants XP only to the lord\'s son', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.unlocked.add(FLAGS.HAY_FIELD_UNLOCKED); // the hay field is locked by default
        session.missions.register(BATTLE_CHAIN);
        session.startMission('test_battle_chain');
        session.messages.clear();
        session.travel('hay_field');

        winChainFight(session, 'goblin_skirmish');
        winChainFight(session, 'goblin_rally');

        // The player's party sits the boss battle out (Federico fights),
        // so the player must not earn anything from it.
        const playerXpBefore = session.team.getCharacter('player')!.experience.currentXp;
        const end = winChainFight(session, 'goblin_chief', true);

        const federico = session.findNpc('lord_son')!.character;
        expect(federico.experience.currentXp).toBe(90); // 9 kills × 10, no assists
        expect(session.team.getCharacter('player')!.experience.currentXp).toBe(playerXpBefore);
        // The message matches what Federico actually earned: no hidden
        // assistant XP is summed into it.
        expect(end.message).toContain('90 XP total');
    });

    it('persists the fighters\' battle damage and XP in the save', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.unlocked.add(FLAGS.HAY_FIELD_UNLOCKED); // the hay field is locked by default
        session.missions.register(BATTLE_CHAIN);
        session.startMission('test_battle_chain');
        session.messages.clear();
        session.travel('hay_field');

        const setup = buildHybridCombat(session, FIGHTS.goblin_skirmish, { random: () => 0.5 });
        const enemyIds = new Set(setup.enemies.map((enemy) => enemy.id));
        const kills = collectKills(driveToEnd(setup.combat), enemyIds);
        const fighters = setup.allies.filter((ally) => !session.team.getCharacter(ally.id));
        session.finishCombat('won', {
            placeId: 'hay_field',
            fightId: 'goblin_skirmish',
            missionId: 'test_battle_chain',
            kills,
            fighters,
            participants: setup.allies,
        });

        const arturoBefore = session.roster.character('arturo')!;
        const soldierBefore = session.roster.character('soldier_0')!;
        // The goblins (random 0.5) focus Arturo during the skirmish.
        expect(arturoBefore.stats.hp).toBeLessThan(arturoBefore.stats.totalHp);

        const restored = WorldSession.fromSave(session.exportSave());
        const arturo = restored.roster.character('arturo')!;
        const soldier = restored.roster.character('soldier_0')!;
        expect(arturo.experience.currentXp).toBe(arturoBefore.experience.currentXp);
        expect(soldier.experience.currentXp).toBe(soldierBefore.experience.currentXp);
        expect(arturo.stats.hp).toBe(arturoBefore.stats.hp);

        // The world npc and the roster entry stay the same character, so
        // the dev page shows the real battle state after a load too.
        const hayNpc = restored.findNpc('soldier_0')!; // at the hay field, mid-mission
        expect(hayNpc.character).toBe(soldier);
        expect(hayNpc.character.experience.currentXp).toBe(soldierBefore.experience.currentXp);
        expect(hayNpc.character.stats.fatigue).toBe(soldierBefore.stats.fatigue);
    });

    it('fleeing the battle fails the mission and moves the people back', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.unlocked.add(FLAGS.HAY_FIELD_UNLOCKED); // the hay field is locked by default
        session.missions.register(BATTLE_CHAIN);
        session.startMission('test_battle_chain');
        session.messages.clear();
        session.travel('hay_field');
        session.consumePendingBattle();

        const setup = buildHybridCombat(session, FIGHTS.goblin_skirmish, { random: () => 0.9 });
        const fighters = setup.allies.filter((ally) => !session.team.getCharacter(ally.id));
        const end = session.finishCombat('fled', {
            placeId: 'hay_field',
            fightId: 'goblin_skirmish',
            missionId: 'test_battle_chain',
            fighters,
        });

        expect(end.message).toContain('Mission failed');
        expect(session.npcsAt('hay_field')).toEqual([]);
        expect(session.npcsAt('farm').map((npc) => npc.id)).toContain('lord_son');
        expect(session.npcsAt('camp').map((npc) => npc.id)).toContain('arturo');
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
