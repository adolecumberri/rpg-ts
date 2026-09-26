import type { Character } from '../../../src';
import type { AutoTargetPreference, AutoUsePolicy, SkillSpec } from '../skills';
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

// skillId -> the current ramped chance of the skill (the patience meter).
export type AutoSkillMeters = Map<string, number>;

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

// The alive members of a side, ordered by the preference (ascending
// score wins), cut to `count`.
function preferTargets(
    side: Character[],
    prefer: AutoTargetPreference,
    count: number,
): string[] {
    const score = (character: Character): number => {
        switch (prefer) {
            case 'lowest_hp':
                return character.getStat('hp');
            case 'highest_attack':
                return -character.getStat('attack');
            case 'most_negative_statuses': {
                let negatives = 0;
                for (const status of character.statusManager.statuses.values()) {
                    if (status.definition.polarity === 'negative') negatives++;
                }
                return -negatives;
            }
        }
    };

    return side
        .filter((character) => character.stats.hp > 0)
        .sort((a, b) => score(a) - score(b))
        .slice(0, count)
        .map((character) => character.id);
}

/** The targets a skill action hits, following the spec's targeting. */
export function pickSkillTargets(
    spec: SkillSpec,
    actor: Character,
    allies: Character[],
    enemies: Character[],
    random: () => number,
): string[] {
    const policy = spec.auto;
    const prefer = policy?.target?.prefer;
    const side = policy?.target?.side;

    switch (spec.targeting) {
        case 'SELF':
            return actor.stats.hp > 0 ? [actor.id] : [];
        case 'ENEMY': {
            const count = Math.max(1, spec.numberOfTargets ?? 1);
            if (prefer && side === 'enemy') {
                return preferTargets(enemies, prefer, count);
            }
            // Taunt-weighted, sampled without replacement.
            return pickWeightedTargets(enemies, count, random).map((character) => character.id);
        }
        case 'ALL_ENEMIES':
            return enemies.map((character) => character.id);
        case 'ALL_ALLIES':
            return allies.map((character) => character.id);
        case 'ALLY': {
            const count = Math.max(1, spec.numberOfTargets ?? 1);
            return preferTargets(allies, prefer ?? 'lowest_hp', count);
        }
        case 'ANY':
            // Freely picked targets (Dispel, Cure, First Aid): the
            // policy's target preference decides, or nothing (manual
            // use only).
            if (!policy?.target) return [];
            return preferTargets(policy.target.side === 'ally' ? allies : enemies, prefer!, Math.max(1, spec.numberOfTargets ?? 1));
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
 * next N actions after the use" (shared cooldowns consume one step per
 * action of the side). A failing roll with a chanceRampPerAction set
 * grows the chance in `meters` (the patience meter), capped by
 * maxChance, until the skill fires or its conditions stop holding.
 * When no skill fires, the fighter attacks a taunt-weighted target.
 *
 * The cooldown map and the meter map are mutated in place: the engine
 * owns one of each per fighter (plus one shared cooldown map per side).
 */
export function planAutoAction(params: {
    actor: Character;
    allies: Character[];
    enemies: Character[];
    skills: SkillSpec[];
    cooldowns: AutoSkillCooldowns;
    // The patience meters (skillId -> ramped chance). The engine owns
    // one per fighter; callers without one get a fresh map per call.
    meters?: AutoSkillMeters;
    // The side-wide cooldown map (sharedCooldown skills lock here).
    sharedCooldowns?: AutoSkillCooldowns;
    random: () => number;
}): AutoAction {
    const { actor, allies, enemies, skills, cooldowns, sharedCooldowns, random } = params;
    const meters = params.meters ?? new Map<string, number>();
    const context = { actor, allies, enemies };

    for (const spec of skills) {
        const policy: AutoUsePolicy | undefined = spec.auto;
        if (!policy) continue;

        // Cooldown: shared skills lock the whole side; the rest lock
        // the fighter.
        if (policy.sharedCooldown && sharedCooldowns) {
            const remaining = sharedCooldowns.get(spec.id) ?? 0;
            if (remaining > 0) {
                sharedCooldowns.set(spec.id, remaining - 1);
                continue;
            }
        } else {
            const remaining = cooldowns.get(spec.id) ?? 0;
            if (remaining > 0) {
                cooldowns.set(spec.id, remaining - 1);
                continue;
            }
        }

        if (!conditionsMet(policy, context)) {
            // The situation changed: the patience meter resets.
            meters.delete(spec.id);
            continue;
        }

        // The chance: base, ramped by every failed roll since the
        // conditions started holding.
        const base = policy.chancePercent ?? 100;
        const ramp = policy.chanceRampPerAction ?? 0;
        const cap = policy.maxChance ?? 100;
        const chance = ramp > 0 ? Math.min(cap, meters.get(spec.id) ?? base) : base;

        if (random() * 100 >= chance) {
            if (ramp > 0) meters.set(spec.id, Math.min(cap, chance + ramp));
            continue;
        }

        meters.delete(spec.id);
        const lock = policy.cooldownActions ?? 0;
        if (policy.sharedCooldown && sharedCooldowns) {
            sharedCooldowns.set(spec.id, lock);
        } else {
            cooldowns.set(spec.id, lock);
        }
        return { kind: 'skill', spec, targetIds: pickSkillTargets(spec, actor, allies, enemies, random) };
    }

    const target = pickWeightedTarget(enemies, random);
    return { kind: 'attack', targetId: target?.id ?? '' };
}
