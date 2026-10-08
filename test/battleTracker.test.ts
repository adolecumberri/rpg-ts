import { Character, Stats } from '../src';
import { IntervalCombat } from '../src/classes/Combat/IntervalCombat';
import {
    BattleTracker,
    trackHybridEvent,
    trackIntervalRecord,
} from '../worldTest/core/combat/battleTracker';
import { HybridCombat } from '../worldTest/core/combat/hybridCombat';
import { generalAttackResolver } from '../worldTest/core/damage/general';
import { assignReactiveSkills } from '../worldTest/core/skills';
import { WorldSession } from '../worldTest/core/session';
import { DEFAULT_ITEM_TABLE } from '../worldTest/core/items';

function fighter(id: string, stats: Partial<import('../src').Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

describe('the battle tracker', () => {
    it('the tick engine observer records damage dealt and received per kind', () => {
        const tracker = new BattleTracker();
        const attacker = fighter('attacker', { attack: 10, hp: 1000, totalHp: 1000, defence: 0 });
        const defender = fighter('defender', { hp: 1000, totalHp: 1000, defence: 0 });

        new IntervalCombat({
            randomTarget: false,
            maxTicks: 10,
            random: () => 1, // no crits
            damageResolver: generalAttackResolver,
            onAction: (record) => trackIntervalRecord(tracker, record),
        }).resolve(
            [{ character: attacker, interval: 1 }],
            [{ character: defender, interval: 100 }],
        );

        // 10 ticks × 10 physical: dealt and received match.
        expect(tracker.statsOf('attacker').damageDealt).toEqual({
            physical: 100,
            magical: 0,
            true: 0,
        });
        expect(tracker.statsOf('defender').damageReceived.physical).toBe(100);
    });

    it('the resolver fills byKind from the breakdown (guinsoo)', () => {
        const attacker = fighter('attacker', { attack: 10, hp: 100, totalHp: 100, defence: 0 });
        attacker.equipment.equipOrReplace(DEFAULT_ITEM_TABLE.createItem('guinsoo_rageblade'), attacker);

        const hit = generalAttackResolver(attacker, fighter('dummy', { hp: 100, totalHp: 100 }), () => 1);

        expect(hit.byKind).toEqual({ physical: 16, magical: 6 });
    });

    it('self-heals count as healing given and received', () => {
        const tracker = new BattleTracker();
        const healer = fighter('healer', { attack: 0, hp: 50, totalHp: 100, defence: 0 });

        new IntervalCombat({
            randomTarget: false,
            maxTicks: 3,
            random: () => 1,
            onAction: (record) => trackIntervalRecord(tracker, record),
        }).resolve(
            [{
                character: healer,
                interval: 1,
                actionResolver: () => ({
                    targets: 1,
                    healSelf: 5,
                    damageResolver: () => ({ damage: 0 }),
                }),
            }],
            [{ character: fighter('dummy', { hp: 1000, totalHp: 1000 }), interval: 100 }],
        );

        expect(tracker.statsOf('healer').healingGiven).toBe(15);
        expect(tracker.statsOf('healer').healingReceived).toBe(15);
    });

    it('counter-attacks count as the defender\'s damage', () => {
        const tracker = new BattleTracker();
        const attacker = fighter('attacker', { attack: 10, hp: 1000, totalHp: 1000, defence: 0 });
        const defender = fighter('defender', { hp: 1000, totalHp: 1000, defence: 0 });
        assignReactiveSkills(defender, ['spike_shield']);

        const hit = generalAttackResolver(attacker, defender, () => 1);
        expect(hit.reflect).toBe(10); // 10 + 0 defence
        expect(hit.reflectByKind).toEqual({ physical: 10 });

        trackIntervalRecord(tracker, {
            tick: 1,
            actorId: 'attacker',
            targetId: 'defender',
            damage: hit.damage,
            damageByKind: hit.byKind,
            reflect: hit.reflect,
            reflectByKind: hit.reflectByKind,
        });

        expect(tracker.statsOf('attacker').damageDealt.physical).toBe(10);
        expect(tracker.statsOf('defender').damageDealt.physical).toBe(10); // the counter
        expect(tracker.statsOf('defender').damageReceived.physical).toBe(10);
        expect(tracker.statsOf('attacker').damageReceived.physical).toBe(10);
    });

    it('hybrid engine events feed the tracker: attacks, skill heals and kills', () => {
        const tracker = new BattleTracker();
        const attacker = fighter('attacker', { attack: 10, hp: 100, totalHp: 100, defence: 0 });
        const defender = fighter('defender', { hp: 100, totalHp: 100, defence: 0 });

        const combat = new HybridCombat([
            { character: attacker, interval: 1, side: 'left' },
            { character: defender, interval: 100, side: 'right' },
        ], { random: () => 1, onAction: (event) => trackHybridEvent(tracker, event) });
        combat.next();

        expect(tracker.statsOf('attacker').damageDealt.physical).toBe(10);
        expect(tracker.statsOf('defender').damageReceived.physical).toBe(10);

        // A skill heal and a kill, fed from their event shapes.
        trackHybridEvent(tracker, {
            kind: 'auto',
            tick: 2,
            actorId: 'healer',
            targetId: 'ally',
            damage: 0,
            heal: 8,
            targetHpAfter: 58,
            targetAlive: true,
            skillId: 'cure',
            targetIds: ['ally'],
            effects: [{ targetId: 'ally', damage: 0, heal: 8 }],
        });
        trackHybridEvent(tracker, {
            kind: 'auto',
            tick: 3,
            actorId: 'attacker',
            targetId: 'defender',
            damage: 5,
            targetHpAfter: 0,
            targetAlive: false,
            kills: [{ targetId: 'defender', killerId: 'attacker' }],
        });

        expect(tracker.statsOf('healer').healingGiven).toBe(8);
        expect(tracker.statsOf('ally').healingReceived).toBe(8);
        expect(tracker.statsOf('attacker').kills).toBe(1);
    });

    it('finishCombat carries the tracker\'s report into the result', () => {
        const session = new WorldSession({ random: () => 0.5 });
        const tracker = new BattleTracker();
        tracker.recordHit('player', 'goblin', 10, { physical: 10 });

        const end = session.finishCombat('won', { placeId: 'farm', tracker });

        const player = end.report?.find((entry) => entry.id === 'player');
        expect(player?.stats.damageDealt).toEqual({ physical: 10, magical: 0, true: 0 });
        expect(end.report?.find((entry) => entry.id === 'goblin')?.stats.damageReceived).toEqual({
            physical: 10,
            magical: 0,
            true: 0,
        });
    });
});
