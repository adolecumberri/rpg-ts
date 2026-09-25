import { Character, IntervalCombat, Stats } from '../src';
import type { Statistics } from '../src';
import { StatusInstance } from '../src/classes/StatusInstance';
import {
    allSkillSpecs,
    assignReactiveSkills,
    battleSkillSpecs,
    hasStatusNamed,
    removeReactiveSkill,
    setReactiveSkills,
    specOf,
} from '../worldTest/core/skills';
import { hasteStatus, rageStatus, gateOpenedStatus, berserkStatus } from '../worldTest/core/statuses';
import { generalAttackResolver, resolveGeneralAttack } from '../worldTest/core/damage/general';
import { addReaction, reactionsOf } from '../worldTest/core/damage/reactions';
import { HybridCombat } from '../worldTest/core/combat/hybridCombat';
import { rampGatePower } from '../worldTest/core/combat/ramp';

const noCrit = () => 1;

function character(id: string, stats: Partial<Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

describe('skill catalog', () => {
    it('contains exactly the general autofight skills (old skills removed)', () => {
        expect(allSkillSpecs().map((spec) => spec.id)).toEqual([
            'spike_shield',
            'parry',
            'haste',
            'rage',
            'fire_breath',
            'defend',
            'rest',
            'open_gate',
            'boss_regen',
            'boss_berserk',
        ]);
        expect(specOf('fireball')).toBeUndefined();
        expect(specOf('warcry')).toBeUndefined();
    });

    it('leaves characters reaction-less until a config attaches the skills', () => {
        expect(reactionsOf(character('hero', {}))).toEqual([]);
    });
});

describe('haste and rage statuses', () => {
    it('haste raises speed by 8 for 3 turns', () => {
        const status = hasteStatus();
        expect(status.name).toBe('Haste');
        expect(status.duration).toEqual({ type: 'TEMPORAL', value: 3 });
        expect(status.statsAffected).toEqual([
            { from: 'speed', to: 'speed', value: 8, typeOfModification: 'BUFF_FIXED' },
        ]);

        const hero = character('hero', { speed: 5 });
        hero.statusManager.addStatusInstance(new StatusInstance({ definition: status }));
        expect(hero.getStat('speed')).toBe(13);
    });

    it('rage raises attack and speed but lowers defence for 3 turns', () => {
        const status = rageStatus();
        expect(status.name).toBe('Rage');
        expect(status.duration).toEqual({ type: 'TEMPORAL', value: 3 });

        const hero = character('hero', { attack: 10, defence: 5, speed: 6 });
        hero.statusManager.addStatusInstance(new StatusInstance({ definition: status }));

        expect(hero.getStat('attack')).toBe(12); // +20%
        expect(hero.getStat('defence')).toBe(4); // -20%
        expect(hero.getStat('speed')).toBe(10); // +4
    });
});

describe('reactive skills', () => {
    it('spike shield reflects 18% of the damage taken as true damage', () => {
        const attacker = character('a', { attack: 10, hp: 100, totalHp: 100 });
        const defender = character('spike-d', { defence: 0, hp: 100, totalHp: 100 });
        assignReactiveSkills(defender, ['spike_shield']);

        const outcome = resolveGeneralAttack(attacker, defender, noCrit);

        expect(outcome.damage).toBe(10); // the defender still takes the hit
        expect(outcome.reflect).toBe(1.8); // 18% back, bypassing everything
        expect(outcome.note).toContain('spiked');
    });

    it('parry negates the attack and returns 70% of the damage', () => {
        const attacker = character('a', { attack: 10, hp: 100, totalHp: 100 });
        const defender = character('parry-d', { defence: 0, hp: 100, totalHp: 100 });
        assignReactiveSkills(defender, ['parry']);

        const outcome = resolveGeneralAttack(attacker, defender, noCrit);

        expect(outcome.damage).toBe(0); // the defender takes nothing
        expect(outcome.reflect).toBe(7); // 70% of the would-be damage
        expect(outcome.note).toContain('parried');
    });

    it('does nothing when no reactive skill is assigned', () => {
        const attacker = character('a', { attack: 10 });
        const defender = character('none-d', { defence: 0 });

        const outcome = resolveGeneralAttack(attacker, defender, noCrit);

        expect(outcome.damage).toBe(10);
        expect(outcome.reflect).toBe(0);
    });

    it('the interval engine applies reflected damage to the attacker', () => {
        const attacker = character('a', { attack: 10, hp: 100, totalHp: 100 });
        const defender = character('engine-d', { defence: 0, hp: 100, totalHp: 100 });
        assignReactiveSkills(defender, ['parry']);

        const result = new IntervalCombat({
            maxTicks: 2,
            randomTarget: false,
            random: () => 1, // no crits; the 100% parry still triggers
            damageResolver: generalAttackResolver,
        })
            .resolve(
                [{ character: attacker, interval: 1 }],
                [{ character: defender, interval: 2 }],
            );

        // attacker hits ticks 1 and 2: both parried, 7 reflected each
        // (the fatigue system is switched off, so no penalties apply).
        expect(defender.stats.hp).toBe(100);
        expect(attacker.stats.hp).toBe(86);
        expect(result.turns.every((turn) => turn.damageApplied === 0)).toBe(true);
    });
});

describe('reactive skill removal', () => {
    it('granting the same skill twice attaches a single piece', () => {
        const defender = character('d', { defence: 0, hp: 100, totalHp: 100 });
        assignReactiveSkills(defender, ['spike_shield']);
        assignReactiveSkills(defender, ['spike_shield']);

        expect(reactionsOf(defender)).toHaveLength(1);
    });

    it('removing a skill takes its piece away and the hit behaves as before', () => {
        const attacker = character('a', { attack: 10 });
        const defender = character('d', { defence: 0 });
        assignReactiveSkills(defender, ['spike_shield']);
        expect(resolveGeneralAttack(attacker, defender, noCrit).reflect).toBe(1.8);

        expect(removeReactiveSkill(defender, 'spike_shield')).toBe(true);
        expect(reactionsOf(defender)).toHaveLength(0);

        const after = resolveGeneralAttack(attacker, defender, noCrit);
        expect(after.damage).toBe(10);
        expect(after.reflect).toBe(0);
    });

    it('returns false when removing a skill that is not attached', () => {
        const defender = character('d', {});
        expect(removeReactiveSkill(defender, 'parry')).toBe(false);
    });

    it('setReactiveSkills replaces the exact skill list', () => {
        const attacker = character('a', { attack: 10 });
        const defender = character('d', { defence: 0 });
        setReactiveSkills(defender, ['parry']);

        setReactiveSkills(defender, ['spike_shield']);
        const outcome = resolveGeneralAttack(attacker, defender, noCrit);

        // parry piece is gone, spike shield is the only one left
        expect(reactionsOf(defender)).toHaveLength(1);
        expect(outcome.damage).toBe(10);
        expect(outcome.reflect).toBe(1.8);
    });

    it('setReactiveSkills with an empty list removes every attached skill', () => {
        const defender = character('d', {});
        setReactiveSkills(defender, ['spike_shield', 'parry']);

        setReactiveSkills(defender, []);

        expect(reactionsOf(defender)).toHaveLength(0);
    });

    it('never touches reaction pieces attached by other systems', () => {
        const defender = character('d', { defence: 0, hp: 100, totalHp: 100 });
        const custom = ({ incomingDamage }: { incomingDamage: number; attacker: Character; defender: Character; random: () => number }) => ({
            damage: incomingDamage,
            reflect: 1,
            note: 'custom',
        });
        addReaction(defender, custom);

        setReactiveSkills(defender, ['spike_shield']);

        expect(reactionsOf(defender)).toHaveLength(2);

        removeReactiveSkill(defender, 'spike_shield');
        expect(reactionsOf(defender)).toHaveLength(1); // only the custom piece
    });
});

describe('the Gate affinity', () => {
    const federico = () =>
        character('lord_son', { hp: 130, totalHp: 130, attack: 28, defence: 10, speed: 6 });

    it('Open Gate awakens a permanent status that grants Fire Breath', () => {
        const openGate = specOf('open_gate')!;
        expect(openGate.name).toBe('Open Gate');
        expect(openGate.statusOnSelf?.name).toBe('Gate Opened');
        expect(openGate.statusOnSelf?.duration).toEqual({ type: 'PERMANENT' });
        expect(openGate.statusOnSelf?.grantsSkills).toEqual(['fire_breath']);
        expect(openGate.hideWhenStatus).toBe('Gate Opened');
    });

    it('the Gate grants +10 defence immediately and ramps attack/speed per attack, capped', () => {
        const son = federico();
        son.statusManager.addStatusInstance(new StatusInstance({ definition: gateOpenedStatus() }));

        expect(son.getStat('defence')).toBe(20); // 10 base + 10 armour
        expect(son.getStat('attack')).toBe(28); // no stacks yet

        for (let attack = 0; attack < 5; attack++) rampGatePower(son);
        expect(son.getStat('attack')).toBe(68); // +40 (5 × 8)
        expect(son.getStat('speed')).toBe(16); // +10 (5 × 2)
        expect(son.getStat('defence')).toBe(20); // armour stays flat

        rampGatePower(son); // the cap holds
        expect(son.getStat('attack')).toBe(68);
        expect(son.getStat('speed')).toBe(16);
    });

    it('ramps only while the Gate is open', () => {
        const son = federico();
        rampGatePower(son); // no Gate: no-op
        expect(son.getStat('attack')).toBe(28);
        expect(son.getStat('speed')).toBe(6);
    });

    it('derives the skill list from live statuses', () => {
        const son = federico();
        expect(battleSkillSpecs(son, [specOf('open_gate')!]).map((spec) => spec.id)).toEqual(['open_gate']);

        son.statusManager.addStatusInstance(new StatusInstance({ definition: gateOpenedStatus() }));
        // Fire Breath unlocked, the activation skill hidden.
        expect(battleSkillSpecs(son, [specOf('open_gate')!]).map((spec) => spec.id)).toEqual(['fire_breath']);

        // The battle-end cleanup (status removal) takes the skill away.
        son.statusManager.removeAllStatuses();
        expect(battleSkillSpecs(son, [specOf('open_gate')!]).map((spec) => spec.id)).toEqual(['open_gate']);
    });

    it('the hybrid engine unlocks Fire Breath once the affinity is activated', () => {
        const son = federico();
        const goblin = character('goblin', { hp: 1000, totalHp: 1000, attack: 1, defence: 0, speed: 5 });
        const combat = new HybridCombat([
            {
                character: son,
                interval: 2,
                side: 'left',
                manual: true,
                skills: [specOf('defend')!, specOf('rest')!, specOf('open_gate')!],
            },
            { character: goblin, interval: 100, side: 'right' },
        ], { random: () => 0.5 });

        const first = combat.next();
        if (first.kind !== 'manual') throw new Error('expected a manual prompt');
        expect(first.skills).toEqual(['defend', 'rest', 'open_gate']); // no Fire Breath yet

        const cast = combat.resolveManualSkill('open_gate');
        expect(cast?.skillId).toBe('open_gate');
        expect(hasStatusNamed(son, 'Gate Opened')).toBe(true);
        expect(son.getStat('defence')).toBe(20); // +10 armour on activation

        const second = combat.next();
        if (second.kind !== 'manual') throw new Error('expected a manual prompt');
        expect(second.skills).toEqual(['defend', 'rest', 'fire_breath']); // unlocked, activation hidden

        // Attacking ramps the Gate: +8 attack and +2 speed per hit.
        const hit = combat.resolveManual(second.targets[0]);
        expect(hit?.kind).toBe('auto');
        expect(son.getStat('attack')).toBe(36);
        expect(son.getStat('speed')).toBe(8);

        // Battle end: the delayed trigger (status cleanup) removes the skill.
        son.statusManager.removeAllStatuses();
        const third = combat.next();
        if (third.kind !== 'manual') throw new Error('expected a manual prompt');
        expect(third.skills).toEqual(['defend', 'rest', 'open_gate']);
    });
});
