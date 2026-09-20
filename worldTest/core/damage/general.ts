import type { Character, IntervalDamage, IntervalDamageResolver, Item } from '../../../src';
import { DamageComposer } from './composer';
import type { ComponentLine, DamageComponent, KindMultiplier, ResolveOptions } from './composer';
import { attackComponentsOf, defenceLayersOf } from './character';
import { DAMAGE_TYPES, MITIGATION } from '../config/damage';

export type GeneralAttackOutcome = {
    damage: number;
    // Flavour for logs, e.g. 'crit ×2'.
    note?: string;
    breakdown?: ComponentLine[];
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
 * Multiplicative mitigation a defender applies to each damage kind:
 * 50/(50+defence) for physical, 50/(50+magicDefence) for magical and 1
 * (no mitigation) for true damage.
 */
export function kindMultiplierFor(defender: Character): KindMultiplier {
    return (kind) =>
        kind === DAMAGE_TYPES.PHYSICAL
            ? MITIGATION.constant / (MITIGATION.constant + defender.getStat('defence'))
            : kind === DAMAGE_TYPES.MAGICAL
                ? MITIGATION.constant / (MITIGATION.constant + defender.getStat('magicDefence'))
                : 1;
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
 * apply on top. Pure: it never mutates the defender.
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
    const rolled = rollCrits(attacker, merged, random);

    const result = DamageComposer.resolveKinds(
        rolled.components,
        defenceLayersOf(defender),
        kindMultiplierFor(defender),
        options,
    );

    return {
        damage: result.total,
        breakdown: options.breakdown ? result.breakdown : undefined,
        note: rolled.notes.length > 0 ? rolled.notes.join(' ') : undefined,
    };
}

/**
 * Plugs the general attack into the interval engine: the engine applies
 * the returned damage to the defender and shows the note in the log.
 */
export const generalAttackResolver: IntervalDamageResolver = (attacker, defender, random): IntervalDamage => {
    const outcome = resolveGeneralAttack(attacker, defender, random);
    return { damage: outcome.damage, note: outcome.note };
};
