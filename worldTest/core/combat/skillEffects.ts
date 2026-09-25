import type { Character } from '../../../src';
import { StatusInstance } from '../../../src/classes/StatusInstance';
import type { SkillSpec } from '../skills';
import { DamageComposer } from '../damage/composer';
import type { ComponentLine } from '../damage/composer';
import { defenceLayersOf } from '../damage/character';
import { kindOfElement } from '../config/damage';
import { kindMultiplierFor } from '../damage/general';
import { gainFatigue, restoreFatigue, FATIGUE } from './fatigue';

// ---------------------------------------------------------------------------
// The single skill effect resolver shared by the turn-based combat
// screen and the auto battle engines, so both flows always use the
// exact same damage math (compound composer, defence layers, kind
// multipliers), heals and status applications.
// ---------------------------------------------------------------------------

export type SkillTargetEffect = {
    targetId: string;
    damage: number;
    heal: number;
    statusOnTarget?: string;
    breakdown?: ComponentLine[];
};

export type SkillEffectResult = {
    effects: SkillTargetEffect[];
    statusOnSelf?: string;
    totalDamage: number;
    totalHeal: number;
};

/**
 * Applies a skill to its targets: damage through the compound composer
 * (crit-free, like the turn-based combat), flat heal (capped at totalHp,
 * dead targets skipped) and statuses. Pure data in, battle state out:
 * it mutates the targets' hp/statuses, exactly as the combat screen did.
 */
export function resolveSkillEffect(
    spec: SkillSpec,
    actor: Character,
    targets: Character[],
    options: { breakdown?: boolean } = {},
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
            target.stats.hp = Math.max(0, target.stats.hp - result.total);
            target.stats.isAlive = target.stats.hp > 0 ? 1 : 0;
            effect.damage = result.total;
            effect.breakdown = result.breakdown;
            totalDamage += result.total;
        }

        if (spec.heal && target.stats.hp > 0) {
            const healed = Math.min(spec.heal, target.stats.totalHp - target.stats.hp);
            target.stats.hp += healed;
            effect.heal = healed;
            totalHeal += healed;
        }

        if (spec.statusOnTargets) {
            target.statusManager.addStatusInstance(
                new StatusInstance({ definition: spec.statusOnTargets }),
            );
            effect.statusOnTarget = spec.statusOnTargets.name;
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
