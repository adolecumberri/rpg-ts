import { Character, IntervalCombat, Stats } from '../src';
import type { IntervalCombatant } from '../src';
import { HybridCombat } from '../worldTest/core/combat/hybridCombat';
import { evaluateCondition, validateCondition } from '../worldTest/core/combat/conditions';
import type { AutoCondition, ConditionContext } from '../worldTest/core/combat/conditions';
import { AUTO_CONDITIONS, resolveCondition, describeConditionInput } from '../worldTest/core/config/conditions';
import { planAutoAction, pickSkillTargets, conditionsMet } from '../worldTest/core/combat/autoSkills';
import { resolveSkillEffect } from '../worldTest/core/combat/skillEffects';
import type { SkillSpec } from '../worldTest/core/skills';

function character(id: string, stats: Partial<import('../src').Statistics>): Character {
    return new Character({ id, name: id, stats: new Stats(stats) });
}

function condition(overrides: Partial<AutoCondition>): AutoCondition {
    return {
        subject: 'self',
        stat: 'hp',
        compare: 'below',
        value: 50,
        valueType: 'fixed',
        ...overrides,
    };
}

function spec(overrides: Partial<SkillSpec>): SkillSpec {
    return {
        id: 'skill',
        name: 'Skill',
        description: 'Test skill.',
        targeting: 'SELF',
        ...overrides,
    };
}

const actor = () => character('actor', { hp: 30, totalHp: 100, attack: 5, defence: 0, speed: 6 });

describe('condition evaluator', () => {
    it('compares self stats as fixed values', () => {
        const context: ConditionContext = { actor: actor(), allies: [], enemies: [] };
        expect(evaluateCondition(condition({ compare: 'below', value: 40 }), context)).toBe(true);
        expect(evaluateCondition(condition({ compare: 'over', value: 40 }), context)).toBe(false);
        expect(evaluateCondition(condition({ compare: 'over', value: 20 }), context)).toBe(true);
    });

    it('compares percent values against the stat total', () => {
        const context: ConditionContext = { actor: actor(), allies: [], enemies: [] };
        // 30/100 hp = 30%
        expect(evaluateCondition(condition({ valueType: 'percent', value: 50, compare: 'below' }), context)).toBe(true);
        expect(evaluateCondition(condition({ valueType: 'percent', value: 10, compare: 'below' }), context)).toBe(false);
        expect(evaluateCondition(condition({ valueType: 'percent', value: 20, compare: 'over' }), context)).toBe(true);
    });

    it('matches ally members with any / all / lowest / highest', () => {
        const healthy = character('healthy', { hp: 90, totalHp: 100 });
        const wounded = character('wounded', { hp: 10, totalHp: 100 });
        const context: ConditionContext = { actor: actor(), allies: [healthy, wounded], enemies: [] };
        const below50 = (match?: AutoCondition['match']) =>
            condition({ subject: 'ally', match, valueType: 'percent', value: 50 });

        expect(evaluateCondition(below50('any'), context)).toBe(true);
        expect(evaluateCondition(below50('all'), context)).toBe(false);
        expect(evaluateCondition(below50('lowest'), context)).toBe(true);
        expect(evaluateCondition(below50('highest'), context)).toBe(false);
        expect(evaluateCondition(
            condition({ subject: 'ally', match: 'lowest', valueType: 'percent', value: 5, compare: 'over' }),
            context,
        )).toBe(true); // the most wounded ally is still above 5%
    });

    it('matches enemy members and ignores dead fighters', () => {
        const alive = character('alive', { hp: 60, totalHp: 100 });
        const dead = character('dead', { hp: 0, totalHp: 100 });
        const context: ConditionContext = { actor: actor(), allies: [], enemies: [dead, alive] };

        expect(evaluateCondition(condition({ subject: 'enemy', match: 'all', valueType: 'percent', value: 50, compare: 'over' }), context)).toBe(true);
        // Dead-only side can never satisfy a condition.
        const deadOnly: ConditionContext = { actor: actor(), allies: [], enemies: [dead] };
        expect(evaluateCondition(condition({ subject: 'enemy', valueType: 'percent', value: 50 }), deadOnly)).toBe(false);
    });

    it('rejects percent conditions on stats without a known total', () => {
        const bad = condition({ stat: 'speed', valueType: 'percent' });
        expect(validateCondition(bad)).toContain('no known total');
        expect(() => evaluateCondition(bad, { actor: actor(), allies: [], enemies: [] })).toThrow();
    });
});

describe('condition registry', () => {
    it('resolves named conditions and describes them', () => {
        expect(resolveCondition({ ref: 'selfHpBelowHalf' })).toBe(AUTO_CONDITIONS.selfHpBelowHalf);
        expect(describeConditionInput({ ref: 'selfHpBelowHalf' })).toBe('self hp below 50%');
        expect(describeConditionInput({ ref: 'lowestAllyHpBelowQuarter' })).toBe('lowest ally hp below 25%');
        expect(describeConditionInput({ ref: 'nope' })).toBe('unknown ref: nope');
        expect(() => resolveCondition({ ref: 'nope' })).toThrow('Unknown auto condition reference');
    });
});

describe('auto skill planner', () => {
    it('attacks a taunt-weighted target when the fighter has no skills', () => {
        const tank = character('tank', { hp: 100, totalHp: 100, taunt: 3 });
        const weak = character('weak', { hp: 100, totalHp: 100, taunt: 1 });
        const plan = planAutoAction({
            actor: actor(),
            allies: [],
            enemies: [tank, weak],
            skills: [],
            cooldowns: new Map(),
            random: () => 0.1,
        });
        expect(plan).toEqual({ kind: 'attack', targetId: 'tank' });
    });

    it('uses an eligible skill when conditions pass and the roll succeeds', () => {
        const heal = spec({
            id: 'heal_self',
            name: 'Heal Self',
            heal: 5,
            targeting: 'SELF',
            auto: {
                chancePercent: 100,
                conditions: [condition({ valueType: 'percent', value: 50 })], // 30% < 50%
            },
        });
        const plan = planAutoAction({
            actor: actor(),
            allies: [actor()],
            enemies: [],
            skills: [heal],
            cooldowns: new Map(),
            random: () => 0.9,
        });
        expect(plan.kind).toBe('skill');
        if (plan.kind !== 'skill') return;
        expect(plan.spec.id).toBe('heal_self');
        expect(plan.targetIds).toEqual(['actor']);
    });

    it('skips the skill when the condition fails', () => {
        const heal = spec({
            id: 'heal_self',
            heal: 5,
            targeting: 'SELF',
            auto: { chancePercent: 100, conditions: [condition({ compare: 'below', value: 10 })] }, // 30 < 10 false
        });
        const enemy = character('enemy', { hp: 100, totalHp: 100 });
        const plan = planAutoAction({
            actor: actor(),
            allies: [],
            enemies: [enemy],
            skills: [heal],
            cooldowns: new Map(),
            random: () => 0.9,
        });
        expect(plan).toEqual({ kind: 'attack', targetId: 'enemy' });
    });

    it('rolls the chance independently: a failed roll falls back to the attack', () => {
        const heal = spec({ id: 'heal_self', heal: 5, targeting: 'SELF', auto: { chancePercent: 50 } });
        const enemy = character('enemy', { hp: 100, totalHp: 100 });

        const failed = planAutoAction({
            actor: actor(), allies: [], enemies: [enemy], skills: [heal], cooldowns: new Map(), random: () => 0.9,
        });
        expect(failed).toEqual({ kind: 'attack', targetId: 'enemy' }); // 90 >= 50

        const success = planAutoAction({
            actor: actor(), allies: [], enemies: [enemy], skills: [heal], cooldowns: new Map(), random: () => 0.1,
        });
        expect(success.kind).toBe('skill'); // 10 < 50
    });

    it('respects cooldowns: locked for the next N actions after a use', () => {
        const heal = spec({ id: 'heal_self', heal: 5, targeting: 'SELF', auto: { chancePercent: 100, cooldownActions: 2 } });
        const cooldowns = new Map<string, number>();
        const enemy = character('enemy', { hp: 100, totalHp: 100 });
        const params = { actor: actor(), allies: [], enemies: [enemy], skills: [heal], cooldowns, random: () => 0.9 };

        expect(planAutoAction(params).kind).toBe('skill');   // action 1: use
        expect(planAutoAction(params).kind).toBe('attack');  // action 2: locked
        expect(planAutoAction(params).kind).toBe('attack');  // action 3: locked
        expect(planAutoAction(params).kind).toBe('skill');   // action 4: ready again
    });

    it('combines conditions with all (default) and any', () => {
        const policy = (conditionMatch: 'all' | 'any') => ({
            chancePercent: 100,
            conditions: [
                condition({ compare: 'below', value: 10 }), // false (30 < 10)
                condition({ compare: 'below', value: 40 }), // true
            ],
            conditionMatch,
        });
        expect(conditionsMet(policy('all'), { actor: actor(), allies: [], enemies: [] })).toBe(false);
        expect(conditionsMet(policy('any'), { actor: actor(), allies: [], enemies: [] })).toBe(true);
    });

    it('picks distinct multi targets for ENEMY skills', () => {
        const first = character('first', { hp: 100, totalHp: 100 });
        const second = character('second', { hp: 100, totalHp: 100 });
        const targets = pickSkillTargets(
            spec({ targeting: 'ENEMY', numberOfTargets: 2 }),
            actor(),
            [],
            [first, second],
            () => 0.5,
        );
        expect(targets.sort()).toEqual(['first', 'second']);
    });
});

describe('shared skill effect resolver', () => {
    it('applies damage, heal and statuses like the combat screen', () => {
        const caster = actor();
        const target = character('target', { hp: 50, totalHp: 100, defence: 0, magicDefence: 0 });
        const skill = spec({
            id: 'hit',
            damage: [{ element: 'physical', amount: 10, label: 'Hit' }],
            heal: 5,
            statusOnTargets: { name: 'Bleeding', applyOn: 'after_turn', duration: { type: 'TEMPORAL', value: 3 }, usageFrequency: 'PER_ACTION', statsAffected: [] },
            statusOnSelf: { name: 'Haste', applyOn: 'before_turn', duration: { type: 'TEMPORAL', value: 3 }, usageFrequency: 'PER_ACTION', statsAffected: [] },
        });

        const result = resolveSkillEffect(skill, caster, [target]);
        expect(result.totalDamage).toBe(10);
        expect(target.stats.hp).toBe(45); // 50 - 10 + 5
        expect(target.statusManager.statuses.size).toBe(1);
        expect(caster.statusManager.statuses.size).toBe(1);
    });

    it('caps heals at totalHp and skips dead targets', () => {
        const caster = actor();
        const full = character('full', { hp: 95, totalHp: 100 });
        const dead = character('dead', { hp: 0, totalHp: 100 });
        const skill = spec({ id: 'heal', heal: 20, targeting: 'ALL_ALLIES' });

        const result = resolveSkillEffect(skill, caster, [full, dead]);
        expect(full.stats.hp).toBe(100);
        expect(dead.stats.hp).toBe(0);
        expect(result.totalHeal).toBe(5);
    });
});

describe('auto skills in the hybrid engine', () => {
    it('a wounded fighter uses its self heal, then respects the cooldown', () => {
        const farmer = character('farmer', { hp: 10, totalHp: 40, attack: 5, defence: 0, speed: 6 });
        const goblin = character('goblin', { hp: 100, totalHp: 100, attack: 1, defence: 0, speed: 5 });

        const heal = spec({
            id: 'tend_wounds',
            name: 'Tend Wounds',
            heal: 5,
            targeting: 'SELF',
            auto: {
                chancePercent: 100,
                cooldownActions: 1,
                conditions: [condition({ valueType: 'percent', value: 50 })], // 10/40 = 25% < 50%
            },
        });

        const combat = new HybridCombat([
            { character: farmer, interval: 2, side: 'left', skills: [heal] },
            { character: goblin, interval: 100, side: 'right' },
        ], { random: () => 0.9 });

        const first = combat.next();
        if (first.kind !== 'auto') throw new Error('expected an auto event');
        expect(first.skillId).toBe('tend_wounds');
        expect(first.heal).toBe(5);
        expect(farmer.stats.hp).toBe(15);

        const second = combat.next();
        if (second.kind !== 'auto') throw new Error('expected an auto event');
        expect(second.skillId).toBeUndefined(); // cooldown: basic attack
        expect(farmer.stats.hp).toBe(15); // attack didn't heal

        const third = combat.next();
        if (third.kind !== 'auto') throw new Error('expected an auto event');
        expect(third.skillId).toBe('tend_wounds'); // ready again, still wounded
        expect(farmer.stats.hp).toBe(20);
    });

    it('a skill that kills an enemy reports the kill for XP attribution', () => {
        const farmer = character('farmer', { hp: 40, totalHp: 40, attack: 5, defence: 0, speed: 6 });
        const goblin = character('goblin', { hp: 10, totalHp: 10, attack: 1, defence: 0, speed: 5 });

        const nuke = spec({
            id: 'smash',
            name: 'Smash',
            damage: [{ element: 'physical', amount: 30, label: 'Smash' }],
            targeting: 'ENEMY',
            auto: { chancePercent: 100 },
        });

        const combat = new HybridCombat([
            { character: farmer, interval: 2, side: 'left', skills: [nuke] },
            { character: goblin, interval: 100, side: 'right' },
        ], { random: () => 0.9 });

        const event = combat.next();
        if (event.kind !== 'auto') throw new Error('expected an auto event');
        expect(event.skillId).toBe('smash');
        expect(event.targetId).toBe('goblin');
        expect(event.kills).toEqual([{ targetId: 'goblin', killerId: 'farmer' }]);
        expect(goblin.stats.hp).toBe(0);
    });
});

describe('the library interval action plug-in', () => {
    function combatant(
        id: string,
        stats: Partial<import('../src').Statistics>,
        interval: number,
        actionResolver?: IntervalCombatant['actionResolver'],
    ): IntervalCombatant {
        return {
            character: character(id, { hp: 100, totalHp: 100, attack: 1, defence: 0, ...stats }),
            interval,
            actionResolver,
        };
    }

    it('lets a fighter replace its basic attack with a custom action', () => {
        const hero = combatant('hero', {}, 1, (actor, context) => {
            if (context.actionCount === 1) {
                return { targets: 1, damageResolver: () => ({ damage: 7, note: 'smash' }), note: 'Smash' };
            }
            return null;
        });
        const dummy = combatant('dummy', {}, 100);

        const result = new IntervalCombat({ maxTicks: 4, randomTarget: false }).resolve([hero], [dummy]);

        expect(result.turns).toHaveLength(4);
        expect(result.turns[0].damageApplied).toBe(7);
        expect(result.turns[0].note).toBe('smash Smash');
        // Actions 2-4 fell back to the basic attack (1 damage).
        expect(result.turns[1].damageApplied).toBe(1);
    });

    it('heals the actor before its multi-target action', () => {
        const hero = combatant('hero', { hp: 10, totalHp: 100 }, 1, () => ({
            targets: 2,
            healSelf: 5,
            damageResolver: () => ({ damage: 1, note: 'cleave' }),
            note: 'Cleave',
        }));
        const first = combatant('first', {}, 100);
        const second = combatant('second', {}, 100);

        const result = new IntervalCombat({ maxTicks: 2, randomTarget: false }).resolve([hero], [first, second]);

        expect(hero.character.stats.hp).toBeGreaterThanOrEqual(12); // 10 + 5 - reflected nothing
        expect(result.turns.filter((turn) => turn.tick === 1)).toHaveLength(2); // two targets
    });
});
