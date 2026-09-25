import type { Character, IntervalDamage, IntervalDamageResolver, Item } from '../../../src';
import { DamageComposer } from './composer';
import type { ComponentLine, DamageComponent, KindMultiplier, ResolveOptions } from './composer';
import { attackComponentsOf, defenceLayersOf } from './character';
import { reactionsOf } from './reactions';
import { DAMAGE_TYPES, MITIGATION } from '../config/damage';
import { FATIGUE, gainFatigue } from '../combat/fatigue';
import { rampGatePower } from '../combat/ramp';

export type GeneralAttackOutcome = {
    damage: number;
    // Flavour for logs, e.g. 'crit ×2'.
    note?: string;
    breakdown?: ComponentLine[];
    // Damage reflected back to the attacker by reactive skills (Parry,
    // Spike Shield). Applied by whoever owns the hit application.
    reflect?: number;
};

/**
 * Context passed to an equipped item's onAttack hook: the hook may
 * inspect the attacker's or defender's stats and return the (possibly
 * modified) damage component list.
 */
export type ItemAttackContext = {
    attacker: Character;
    defender: Character;
    item: Item;
    components: DamageComponent[];
};

/**
 * Context passed to an equipped item's onHit hook: the hit landed with
 * real damage (reactions already resolved), so statuses like Bleeding
 * may be applied to the defender.
 */
export type ItemHitContext = {
    attacker: Character;
    defender: Character;
    item: Item;
    damage: number;
};

/**
 * Multiplicative mitigation a defender applies to each damage kind:
 * 50/(50+defence) for physical, 50/(50+magicDefence) for magical and 1
 * (no mitigation) for true damage. Statuses carrying a final damage
 * variation (Defending: -70%) multiply the final result on top — except
 * for true damage, which skips every reduction.
 */
export function kindMultiplierFor(defender: Character): KindMultiplier {
    let variation = 0;
    for (const status of defender.statusManager.statuses.values()) {
        variation += status.definition.finalDamageVariation?.percent ?? 0;
    }
    const finalMultiplier = Math.max(0, 1 + variation / 100);

    return (kind) => {
        if (kind === DAMAGE_TYPES.TRUE) return 1; // true damage ignores everything
        const base = kind === DAMAGE_TYPES.PHYSICAL
            ? MITIGATION.constant / (MITIGATION.constant + defender.getStat('defence'))
            : kind === DAMAGE_TYPES.MAGICAL
                ? MITIGATION.constant / (MITIGATION.constant + defender.getStat('magicDefence'))
                : 1;
        return base * finalMultiplier;
    };
}

/**
 * Merges components that share a kind and element into a single one, so
 * stacked bonuses (base attack + weapon physical damage) are reduced
 * once, as one number, by the defender.
 */
export function mergeComponents(components: DamageComponent[]): DamageComponent[] {
    const merged = new Map<string, DamageComponent>();
    for (const component of components) {
        const key = `${component.kind ?? DAMAGE_TYPES.PHYSICAL}:${component.element}`;
        const existing = merged.get(key);
        if (!existing) {
            merged.set(key, { ...component });
            continue;
        }
        existing.amount = Math.round((existing.amount + component.amount) * 100) / 100;
    }
    return Array.from(merged.values());
}

/**
 * Rolls crits for every physical component of the attack. Magical and
 * true components never crit. The roll uses the injected random source
 * so tests stay deterministic.
 */
export function rollCrits(
    attacker: Character,
    components: DamageComponent[],
    random: () => number,
): { components: DamageComponent[]; notes: string[] } {
    const chance = attacker.getStat('critChance');
    const multiplier = attacker.getStat('critMultiplier');
    const rolled: DamageComponent[] = [];
    const notes: string[] = [];

    for (const component of components) {
        const canCrit = component.kind === DAMAGE_TYPES.PHYSICAL && component.amount > 0;
        if (!canCrit || random() * 100 >= chance) {
            rolled.push(component);
            continue;
        }
        rolled.push({
            ...component,
            amount: Math.round(component.amount * multiplier * 100) / 100,
            crit: true,
        });
        notes.push(`crit ×${multiplier}`);
    }

    return { components: rolled, notes };
}

/**
 * The general attack resolution: base components, then every equipped
 * item's onAttack hook (so weapons can add, scale or duplicate damage
 * using the bearer's and target's stats), then merge, crits and
 * resolution. Physical components are reduced by defence, magical by
 * magicDefence, true by nothing; elemental affinities and resistances
 * apply on top. The damage math is pure: it never mutates the
 * defender's stats. Only the onHit hooks (fired after reactions, and
 * only when the final damage is above 0) may apply side effects such
 * as statuses — a Parry that zeroes the damage skips them entirely.
 */
export function resolveGeneralAttack(
    attacker: Character,
    defender: Character,
    random: () => number,
    options: ResolveOptions = {},
): GeneralAttackOutcome {
    let components = attackComponentsOf(attacker);

    for (const item of attacker.equipment.getEquippedItems()) {
        const hook = item.definition.onAttack;
        if (hook) {
            components = hook({ attacker, defender, item, components });
        }
    }

    const merged = mergeComponents(components);

    // Accuracy: at less than 100 the attack rolls to hit. A miss
    // consumes one random call and deals nothing (no crit roll, no
    // on-hit effects, no reactions). At the default 100 every attack
    // lands without consuming the roll.
    const accuracy = attacker.getStat('accuracy');
    if (accuracy < 100 && random() * 100 >= accuracy) {
        return { damage: 0, note: 'missed' };
    }

    const rolled = rollCrits(attacker, merged, random);

    const result = DamageComposer.resolveKinds(
        rolled.components,
        defenceLayersOf(defender),
        kindMultiplierFor(defender),
        options,
    );

    // Reactive pieces the defender carries fire when it is attacked.
    // The first piece that triggers wins.
    let damage = result.total;
    let reflect = 0;
    const notes = [...rolled.notes];
    for (const reaction of reactionsOf(defender)) {
        const outcome = reaction({ attacker, defender, incomingDamage: damage, random });
        if (!outcome) continue;
        damage = outcome.damage;
        reflect = outcome.reflect;
        if (outcome.note) notes.push(outcome.note);
        break;
    }

    // On-hit effects (Bleeding...) only apply when the attack dealt
    // real damage: reactions that block it (Parry sets damage to 0)
    // prevent them from ever running.
    if (damage > 0) {
        for (const item of attacker.equipment.getEquippedItems()) {
            const hook = item.definition.onHit;
            if (hook) {
                hook({ attacker, defender, item, damage });
            }
        }
    }

    return {
        damage,
        reflect,
        breakdown: options.breakdown ? result.breakdown : undefined,
        note: notes.length > 0 ? notes.join(' ') : undefined,
    };
}

/**
 * Plugs the general attack into the interval engine: the engine applies
 * the returned damage to the defender (and the reflection to the
 * attacker) and shows the note in the log. Every basic attack tires the
 * attacker (+5 fatigue, penalties at thresholds, faint at 100).
 */
export const generalAttackResolver: IntervalDamageResolver = (attacker, defender, random): IntervalDamage => {
    const outcome = resolveGeneralAttack(attacker, defender, random);
    gainFatigue(attacker, FATIGUE.gainPerAttack);
    // The Gate ramps only when the bearer actually attacks.
    rampGatePower(attacker);
    return { damage: outcome.damage, note: outcome.note, reflect: outcome.reflect };
};
