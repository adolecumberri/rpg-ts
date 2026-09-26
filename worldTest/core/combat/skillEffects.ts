import type { Character } from '../../../src';
import { StatusInstance } from '../../../src/classes/StatusInstance';
import type { SkillSpec } from '../skills';
import { DamageComposer } from '../damage/composer';
import type { ComponentLine } from '../damage/composer';
import { defenceLayersOf } from '../damage/character';
import { kindOfElement } from '../config/damage';
import { applyCoverRedirect, kindMultiplierFor } from '../damage/general';
import { applyCover } from './cover';
import { gainFatigue, restoreFatigue, FATIGUE } from './fatigue';
import { removeStatusesByPolarity } from '../statuses';

// ---------------------------------------------------------------------------
// The single skill effect resolver shared by the turn-based combat
// screen and the auto battle engines, so both flows always use the
// exact same damage math (compound composer, defence layers, kind
// multipliers), heals, status applications and dispels.
// ---------------------------------------------------------------------------

export type SkillTargetEffect = {
    targetId: string;
    damage: number;
    heal: number;
    statusOnTarget?: string;
    statusesOnTarget?: string[];
    dispelled?: string[];
    breakdown?: ComponentLine[];
};

export type SkillEffectResult = {
    effects: SkillTargetEffect[];
    statusOnSelf?: string;
    totalDamage: number;
    totalHeal: number;
};

export type SkillEffectOptions = {
    breakdown?: boolean;
    // Whether a target belongs to the enemy side (drives dispel:
    // enemies lose positive statuses, allies lose negative ones).
    isEnemy?: (character: Character) => boolean;
};

/**
 * Applies a skill to its targets: damage through the compound composer
 * (crit-free, like the turn-based combat), flat or dynamic heal (capped
 * at totalHp, dead targets skipped), statuses and side-aware dispel.
 * Pure data in, battle state out: it mutates the targets' hp/statuses.
 */
export function resolveSkillEffect(
    spec: SkillSpec,
    actor: Character,
    targets: Character[],
    options: SkillEffectOptions = {},
): SkillEffectResult {
    const effects: SkillTargetEffect[] = [];
    let totalDamage = 0;
    let totalHeal = 0;

    for (const target of targets) {
        const effect: SkillTargetEffect = { targetId: target.id, damage: 0, heal: 0 };

        // Static `damage` or the actor-scaled `damageFor` hook.
        const damageSpec = spec.damageFor ? spec.damageFor(actor) : spec.damage;
        if (damageSpec) {
            const components = damageSpec.map((component) => ({
                ...component,
                kind: component.kind ?? kindOfElement(component.element),
            }));
            const result = DamageComposer.resolveKinds(
                components,
                defenceLayersOf(target),
                kindMultiplierFor(target),
                { breakdown: options.breakdown },
            );
            // A Cover on the target redirects its share to the coverer
            // (through the coverer's mitigation) and is consumed.
            const redirect = applyCoverRedirect(target, components, result.total, { breakdown: options.breakdown });
            target.stats.hp = Math.max(0, target.stats.hp - redirect.damage);
            target.stats.isAlive = target.stats.hp > 0 ? 1 : 0;
            effect.damage = redirect.damage;
            effect.breakdown = result.breakdown;
            totalDamage += redirect.damage;
        }

        // Static `heal` or the per-target `healFor` hook (Cure's cap,
        // First Aid's attack scaling).
        const healAmount = spec.healFor ? spec.healFor(actor, target) : spec.heal;
        if (healAmount && target.stats.hp > 0) {
            const healed = Math.min(healAmount, target.stats.totalHp - target.stats.hp);
            target.stats.hp += healed;
            effect.heal = healed;
            totalHeal += healed;
        }

        // Dispel resolves by the target's side.
        if (spec.dispel) {
            const isEnemy = options.isEnemy?.(target) ?? false;
            const polarity = isEnemy ? spec.dispel.onEnemy : spec.dispel.onAlly;
            if (polarity === 'positive' || polarity === 'negative') {
                effect.dispelled = removeStatusesByPolarity(target, polarity);
            } else if (polarity === 'all') {
                effect.dispelled = [
                    ...removeStatusesByPolarity(target, 'positive'),
                    ...removeStatusesByPolarity(target, 'negative'),
                ];
            }
        }

        const statuses = [
            ...(spec.statusOnTargets ? [spec.statusOnTargets] : []),
            ...(spec.statusesOnTargets ?? []),
        ];
        if (statuses.length > 0) {
            effect.statusesOnTarget = [];
            for (const status of statuses) {
                target.statusManager.addStatusInstance(new StatusInstance({ definition: status }));
                effect.statusesOnTarget.push(status.name);
            }
            effect.statusOnTarget = effect.statusesOnTarget.join(' + ');
        }

        // Cover: the caster protects this ally. Re-covering the same
        // ally replaces the previous cover (last one wins).
        if (spec.cover) {
            applyCover(target, actor, spec.cover.percent);
            effect.statusesOnTarget = [...(effect.statusesOnTarget ?? []), 'Covered'];
            effect.statusOnTarget = effect.statusesOnTarget.join(' + ');
        }

        effects.push(effect);
    }

    let statusOnSelf: string | undefined;
    if (spec.statusOnSelf) {
        actor.statusManager.addStatusInstance(new StatusInstance({ definition: spec.statusOnSelf }));
        statusOnSelf = spec.statusOnSelf.name;
    }

    // Fatigue management: skills change the caster's fatigue (Rest and
    // Defend restore it) and re-evaluate the penalties. Inert while the
    // fatigue system is switched off.
    if (spec.fatigueDelta && FATIGUE.enabled) {
        if (spec.fatigueDelta < 0) {
            restoreFatigue(actor, -spec.fatigueDelta);
        } else {
            gainFatigue(actor, spec.fatigueDelta);
        }
    }

    return { effects, statusOnSelf, totalDamage, totalHeal };
}
