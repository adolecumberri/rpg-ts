import { Character, Stats } from '../src';
import type { Statistics } from '../src';
import { HybridCombat, buildHybridCombat } from '../worldTest/core/combat/hybridCombat';
import { MANA } from '../worldTest/core/config/mana';
import { WorldSession } from '../worldTest/core/session';
import { FIGHTS } from '../worldTest/core/config/fights';

// ---------------------------------------------------------------------------
// The mana economy: the 30-mana pool, the 20-mana battle opening and the
// +4 turn-start regen, capped at the pool.
// ---------------------------------------------------------------------------

function character(id: string, stats: Partial<Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

describe('mana', () => {
    it('seeds the default mana pool on every character', () => {
        const fighter = character('fighter', {});
        expect(fighter.getStat('mana')).toBe(MANA.total);
        expect(fighter.getStat('totalMana')).toBe(MANA.total);
    });

    it('starts every fighter at the battle opening mana', () => {
        const attacker = character('attacker', { hp: 100, totalHp: 100, attack: 5 });
        const defender = character('defender', { hp: 1000, totalHp: 1000, attack: 0 });
        attacker.stats.mana = 3; // whatever it was, the battle resets it

        new HybridCombat([
            { character: attacker, interval: 1, side: 'left' },
            { character: defender, interval: 100, side: 'right' },
        ]);

        expect(attacker.stats.mana).toBe(MANA.startOfBattle);
        expect(defender.stats.mana).toBe(MANA.startOfBattle);
    });

    it('regains mana at each turn start, capped at the pool', () => {
        const attacker = character('attacker', { hp: 100, totalHp: 100, attack: 5, defence: 0 });
        const defender = character('defender', { hp: 1000, totalHp: 1000, attack: 0, defence: 0 });
        const combat = new HybridCombat([
            { character: attacker, interval: 1, side: 'left' },
            { character: defender, interval: 100, side: 'right' },
        ], { random: () => 1 });
        expect(attacker.stats.mana).toBe(20);

        const manaAfterTurns: number[] = [];
        for (let turn = 0; turn < 4; turn++) {
            combat.next(); // the attacker acts
            manaAfterTurns.push(attacker.stats.mana as number);
        }
        expect(manaAfterTurns).toEqual([24, 28, 30, 30]);
    });

    it('persists mana through the save', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const player = session.team.getCharacter('player')!;
        player.stats.mana = 17;

        const restored = WorldSession.fromSave(session.exportSave());
        expect(restored.team.getCharacter('player')!.stats.mana).toBe(17);
        expect(restored.team.getCharacter('player')!.stats.totalMana).toBe(MANA.total);
    });

    it('a story battle resets the squad mana at its opening', () => {
        const session = new WorldSession({ random: () => 0.5 });
        session.missions.register({
            id: 'mana_check',
            title: 'Mana Check',
            steps: [{ id: 'w', kind: 'wait_battle', completeOn: ['won'], battle: { fightId: 'dev_dummy', placeId: 'farm' } }],
        });
        session.startMission('mana_check');
        session.startMissionBattle('mana_check');

        const setup = buildHybridCombat(session, FIGHTS.dev_dummy, { random: () => 1 });
        for (const ally of setup.allies) {
            expect(ally.stats.mana).toBe(MANA.startOfBattle);
        }
        for (const enemy of setup.enemies) {
            expect(enemy.stats.mana).toBe(MANA.startOfBattle);
        }
    });
});
