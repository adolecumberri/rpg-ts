import { Character, Stats } from '../src';
import { StatusInstance } from '../src/classes/StatusInstance';
import { HybridCombat } from '../worldTest/core/combat/hybridCombat';
import { WorldSession } from '../worldTest/core/session';
import {
    FATIGUE,
    consumeFaintTurn,
    gainFatigue,
    restoreFatigue,
} from '../worldTest/core/combat/fatigue';
import { generalAttackResolver, kindMultiplierFor, resolveGeneralAttack } from '../worldTest/core/damage/general';
import { resolveSkillEffect } from '../worldTest/core/combat/skillEffects';
import { DEFAULT_SKILLS, specOf } from '../worldTest/core/skills';
import { faintStatus, statusTooltip } from '../worldTest/core/statuses';
import { DEFAULT_ITEM_TABLE } from '../worldTest/core/items';

function character(id: string, stats: Partial<import('../src').Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

// The fatigue system ships switched OFF; these tests turn it back on
// and restore the default at the end.
beforeEach(() => { FATIGUE.enabled = true; });
afterAll(() => { FATIGUE.enabled = false; });

describe('the fatigue system switched off (default)', () => {
    beforeEach(() => { FATIGUE.enabled = false; });

    it('accumulates nothing and applies no penalties', () => {
        expect(FATIGUE.enabled).toBe(false);
        const attacker = character('attacker', { attack: 20, hp: 100, totalHp: 100 });
        const defender = character('defender', { hp: 100, totalHp: 100, defence: 0 });

        generalAttackResolver(attacker, defender, () => 0.5);

        expect(attacker.stats.fatigue).toBe(0);
        expect(attacker.getStat('attack')).toBe(20);
        expect(attacker.statusManager.hasStatus('fatigue')).toBe(false);
    });

    it('Rest is hidden from the default kit while the system is off', () => {
        const session = new WorldSession({ random: () => 0.5 });
        expect(session.availableSkillIds(session.team.getCharacter('player')!)).toEqual(['defend']);
    });
});

describe('fatigue stat', () => {
    it('defaults to 0 and accuracy defaults to 100', () => {
        const fresh = character('fresh', { hp: 10, totalHp: 10 });
        expect(fresh.getStat('fatigue')).toBe(0);
        expect(fresh.getStat('accuracy')).toBe(100);
    });

    it('gains 5 fatigue per basic attack through the general resolver', () => {
        const attacker = character('attacker', { attack: 10, hp: 100, totalHp: 100 });
        const defender = character('defender', { hp: 100, totalHp: 100, defence: 0 });

        const outcome = generalAttackResolver(attacker, defender, () => 0.9);
        expect(outcome.damage).toBe(10);
        expect(attacker.stats.fatigue).toBe(FATIGUE.gainPerAttack);
    });
});

describe('fatigue penalties', () => {
    it('scales the penalties with the fatigue value (the per-N table)', () => {
        const fighter = character('fighter', { hp: 100, totalHp: 100, attack: 20, defence: 10, speed: 6 });

        gainFatigue(fighter, 5);
        expect(fighter.statusManager.hasStatus('fatigue')).toBe(true);
        expect(fighter.getStat('attack')).toBe(19); // -5% at 5

        gainFatigue(fighter, 5); // 10
        expect(fighter.getStat('attack')).toBe(18); // -10%
        expect(fighter.getStat('defence')).toBe(9); // -10%
        expect(fighter.getStat('accuracy')).toBe(90); // -10

        gainFatigue(fighter, 5); // 15
        expect(fighter.getStat('attack')).toBe(17); // -15%
        expect(fighter.getStat('speed')).toBe(5); // -1

        gainFatigue(fighter, 5); // 20
        expect(fighter.getStat('attack')).toBe(16); // -20%
        expect(fighter.getStat('defence')).toBe(8); // -20%
        expect(fighter.getStat('accuracy')).toBe(80); // -20

        restoreFatigue(fighter, 10); // back to 10
        expect(fighter.getStat('attack')).toBe(18);
        expect(fighter.getStat('defence')).toBe(9);
        expect(fighter.getStat('accuracy')).toBe(90);
        expect(fighter.getStat('speed')).toBe(6);

        restoreFatigue(fighter, 10); // back to 0
        expect(fighter.statusManager.hasStatus('fatigue')).toBe(false);
        expect(fighter.getStat('attack')).toBe(20);
    });

    it('faints at 100: fatigue resets to 0 and the fighter loses exactly 2 of its own actions', () => {
        const farmer = character('farmer', { hp: 40, totalHp: 40, attack: 5, defence: 0, speed: 6 });
        const goblin = character('goblin', { hp: 1000, totalHp: 1000, attack: 0, defence: 0, speed: 5 });

        const combat = new HybridCombat([
            { character: farmer, interval: 2, side: 'left' },
            { character: goblin, interval: 100, side: 'right' },
        ], { random: () => 0 }); // never crits, never misses: every attack lands

        // 19 attacks -> 95 fatigue; the 20th reaches 100.
        for (let attack = 0; attack < 19; attack++) {
            const event = combat.next();
            if (event.kind !== 'auto') throw new Error('expected an attack');
        }
        expect(farmer.stats.fatigue).toBe(95);

        const twentieth = combat.next();
        if (twentieth.kind !== 'auto') throw new Error('expected an attack');
        expect(farmer.stats.fatigue).toBe(0); // reset by the faint
        expect(farmer.statusManager.hasStatus('faint')).toBe(true);

        // The fighter skipped ticks 42 and 44: the next attack is at 46.
        const awake = combat.next();
        if (awake.kind !== 'auto') throw new Error('expected an attack');
        expect(awake.tick).toBe(46);
        expect(farmer.statusManager.hasStatus('faint')).toBe(false);
        expect(farmer.stats.fatigue).toBe(5); // attacking again
    });

    it('consumeFaintTurn reports exactly two lost turns', () => {
        const fighter = character('fighter', { hp: 10, totalHp: 10 });
        fighter.statusManager.addStatusInstance(
            new StatusInstance({ definition: faintStatus(), id: 'faint' }),
        );
        expect(consumeFaintTurn(fighter)).toBe(true); // turn 1 lost
        expect(consumeFaintTurn(fighter)).toBe(true); // turn 2 lost
        expect(consumeFaintTurn(fighter)).toBe(false); // awake again
        expect(fighter.statusManager.hasStatus('faint')).toBe(false);
    });

    it('statusTooltip shows the CURRENT debuffs, not the table', () => {
        const fighter = character('fighter', { hp: 100, totalHp: 100, attack: 20, defence: 10, speed: 6 });
        gainFatigue(fighter, 5);
        const fatigueStatus = () => Array.from(fighter.statusManager.statuses.values())
            .find((status) => status.definition.name === 'Fatigue')!;

        // 5 fatigue: only the attack penalty applies.
        expect(statusTooltip(fatigueStatus().definition)).toBe('attack -5%');

        gainFatigue(fighter, 15); // 20 fatigue
        expect(statusTooltip(fatigueStatus().definition))
            .toBe('attack -20% · defence -20% · accuracy -20 · speed -1');

        restoreFatigue(fighter, 10); // 10 fatigue
        expect(statusTooltip(fatigueStatus().definition))
            .toBe('attack -10% · defence -10% · accuracy -10');
    });
});

describe('accuracy', () => {
    it('never rolls at the default 100', () => {
        const attacker = character('attacker', { attack: 10, hp: 100, totalHp: 100 });
        const defender = character('defender', { hp: 100, totalHp: 100, defence: 0 });
        expect(resolveGeneralAttack(attacker, defender, () => 0.95).damage).toBe(10);
    });

    it('at 90 accuracy the attack rolls to hit', () => {
        const attacker = character('attacker', { attack: 10, hp: 100, totalHp: 100, accuracy: 90 });
        const defender = character('defender', { hp: 100, totalHp: 100, defence: 0 });

        const missed = resolveGeneralAttack(attacker, defender, () => 0.95);
        expect(missed.damage).toBe(0);
        expect(missed.note).toBe('missed');
        expect(resolveGeneralAttack(attacker, defender, () => 0.5).damage).toBe(10);
    });

    it('a missed attack skips on-hit effects like bleeding', () => {
        const attacker = character('farmer', { attack: 4, hp: 14, totalHp: 14, defence: 1, speed: 6, accuracy: 90 });
        attacker.equipment.equipOrReplace(DEFAULT_ITEM_TABLE.createItem('sickle'), attacker);
        const defender = character('goblin', { hp: 100, totalHp: 100, defence: 0, magicDefence: 0 });

        resolveGeneralAttack(attacker, defender, () => 0.95); // miss
        expect(defender.statusManager.statuses.size).toBe(0);
    });
});

describe('defend and rest skills', () => {
    it('every character knows them by default', () => {
        const session = new WorldSession({ random: () => 0.5 });
        expect(session.availableSkillIds(session.team.getCharacter('player')!)).toEqual(DEFAULT_SKILLS);
        expect(DEFAULT_SKILLS).toEqual(['defend', 'rest']);
    });

    it('Defend restores 10 fatigue and cuts damage taken by 70%', () => {
        const fighter = character('fighter', { hp: 100, totalHp: 100, attack: 5, defence: 0, speed: 6 });
        gainFatigue(fighter, 30);

        resolveSkillEffect(specOf('defend')!, fighter, [fighter]);

        expect(fighter.stats.fatigue).toBe(20);
        const defending = Array.from(fighter.statusManager.statuses.values())
            .find((status) => status.definition.name === 'Defending');
        expect(defending?.definition.finalDamageVariation).toEqual({ percent: -70 });
        // physical: 50/(50+0) = 1, times (1 - 70/100) = 0.3
        expect(kindMultiplierFor(fighter)('physical')).toBeCloseTo(0.3);
        // true damage skips the variation entirely
        expect(kindMultiplierFor(fighter)('true')).toBe(1);
    });

    it('Rest recovers 20 fatigue and the penalties shrink with the value', () => {
        const fighter = character('fighter', { hp: 100, totalHp: 100, attack: 5, defence: 0, speed: 6 });
        gainFatigue(fighter, 25); // 25: attack -25%, defence/accuracy -20%, speed -1

        resolveSkillEffect(specOf('rest')!, fighter, [fighter]);

        expect(fighter.stats.fatigue).toBe(5);
        expect(fighter.statusManager.hasStatus('fatigue')).toBe(true);
        expect(fighter.getStat('attack')).toBe(4.75); // -5% at 5
        expect(fighter.getStat('accuracy')).toBe(100); // no accuracy penalty at 5
        expect(fighter.getStat('speed')).toBe(6);
    });
});
