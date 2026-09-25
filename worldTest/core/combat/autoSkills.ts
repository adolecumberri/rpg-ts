import type { Character } from '../../../src';
import type { SkillSpec } from '../skills';
import type { AutoUsePolicy } from '../skills';
import { evaluateCondition } from './conditions';
import { pickWeightedTarget, pickWeightedTargets } from './targeting';
import { resolveCondition } from '../config/conditions';

// ---------------------------------------------------------------------------
// The auto battle skill planner: decides what an automatic fighter does
// when its interval tick arrives — one of its skills (when the policy
// allows it) or a basic attack.
// ---------------------------------------------------------------------------

// skillId -> how many of the fighter's upcoming actions it stays locked.
export type AutoSkillCooldowns = Map<string, number>;

export type AutoAction =
    | { kind: 'attack'; targetId: string }
    | { kind: 'skill'; spec: SkillSpec; targetIds: string[] };

/** Whether the policy's conditions hold for the current battle state. */
export function conditionsMet(
    policy: NonNullable<SkillSpec['auto']>,
    context: { actor: Character; allies: Character[]; enemies: Character[] },
): boolean {
    const conditions = (policy.conditions ?? []).map(resolveCondition);
    if (conditions.length === 0) return true;
    const match = policy.conditionMatch ?? 'all';
    if (match === 'any') {
        return conditions.some((condition) => evaluateCondition(condition, context));
    }
    return conditions.every((condition) => evaluateCondition(condition, context));
}

/** The targets a skill action hits, following the spec's targeting. */
export function pickSkillTargets(
    spec: SkillSpec,
    actor: Character,
    allies: Character[],
    enemies: Character[],
    random: () => number,
): string[] {
    switch (spec.targeting) {
        case 'SELF':
            return actor.stats.hp > 0 ? [actor.id] : [];
        case 'ENEMY': {
            const count = Math.max(1, spec.numberOfTargets ?? 1);
            // Taunt-weighted, sampled without replacement.
            return pickWeightedTargets(enemies, count, random).map((character) => character.id);
        }
        case 'ALL_ENEMIES':
            return enemies.map((character) => character.id);
        case 'ALL_ALLIES':
            return allies.map((character) => character.id);
        default:
            return [];
    }
}

/**
 * Plans the next action of an automatic fighter.
 *
 * Skills are considered in catalog order with an independent roll each:
 * the first one whose conditions pass, cooldown is ready and chance
 * roll succeeds wins. Locked cooldowns consume one action each time
 * they are checked, so cooldownActions N means "unavailable for the
 * next N actions after the use". When no skill fires, the fighter
 * attacks a taunt-weighted target.
 *
 * The cooldown map is mutated in place: the engine owns one per fighter.
 */
export function planAutoAction(params: {
    actor: Character;
    allies: Character[];
    enemies: Character[];
    skills: SkillSpec[];
    cooldowns: AutoSkillCooldowns;
    random: () => number;
}): AutoAction {
    const { actor, allies, enemies, skills, cooldowns, random } = params;
    const context = { actor, allies, enemies };

    for (const spec of skills) {
        const policy: AutoUsePolicy | undefined = spec.auto;
        if (!policy) continue;

        const remaining = cooldowns.get(spec.id) ?? 0;
        if (remaining > 0) {
            // Locked: this action consumes one cooldown step.
            cooldowns.set(spec.id, remaining - 1);
            continue;
        }
        if (!conditionsMet(policy, context)) continue;
        if (random() * 100 >= (policy.chancePercent ?? 100)) continue;

        cooldowns.set(spec.id, policy.cooldownActions ?? 0);
        return { kind: 'skill', spec, targetIds: pickSkillTargets(spec, actor, allies, enemies, random) };
    }

    const target = pickWeightedTarget(enemies, random);
    return { kind: 'attack', targetId: target?.id ?? '' };
}
