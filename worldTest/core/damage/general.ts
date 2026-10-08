import type { Character, IntervalDamage, IntervalDamageResolver, Item } from '../../../src';
import { DamageComposer } from './composer';
import type { ComponentLine, DamageComponent, KindMultiplier, ResolveOptions } from './composer';
import { attackComponentsOf, defenceLayersOf } from './character';
import { resolveImpactHits } from './impact';
import { reactionsOf } from './reactions';
import { kindTotalsOfBreakdown } from '../combat/battleTracker';
import type { DamageKindTotals } from '../combat/battleTracker';
import { DAMAGE_TYPES, MITIGATION } from '../config/damage';
import { FATIGUE, gainFatigue } from '../combat/fatigue';
import { rampGatePower } from '../combat/ramp';
import { consumeCover, coverOf, takeCoveredHit } from '../combat/cover';
import { equippedItemsOf } from '../equipment/loadout';

export type GeneralAttackOutcome = {
    damage: number;
    // Flavour for logs, e.g. 'crit ×2'.
    note?: string;
    breakdown?: ComponentLine[];
    // The counter-attack the defender's reaction built back at the
    // attacker: an attack instance the applier resolves as a real hit
    // (mitigated by the attacker's defence, crit-able).
    counter?: { components: DamageComponent[] };
    // The hit's assembled components (post impact phase, pre merge):
    // each instance reads separately (Attack, Sheen, Impact...).
    components?: DamageComponent[];
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
        const base = kind === DAMAGE_TYPES.PHYSICAL ?
            MITIGATION.constant / (MITIGATION.constant + defender.getStat('defence')) :
            kind === DAMAGE_TYPES.MAGICAL ?
                MITIGATION.constant / (MITIGATION.constant + defender.getStat('magicDefence')) :
                1;
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
 */export function rollCrits(
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
 * The Cover redirect: when the defender is protected by a Cover, the
 * given share of the hit goes to the coverer instead, resolved with the
 * COVERER's own defence layers and kind mitigation (so the paladin's
 * armour matters). The share is applied to the coverer's hp and the
 * cover is consumed (single use). Returns the damage the defender
 * actually suffers.
 */
export function applyCoverRedirect(
    defender: Character,
    components: DamageComponent[],
    defenderDamage: number,
    options: ResolveOptions = {},
): { damage: number; coverNote?: string } {
    const cover = coverOf(defender);
    if (!cover || defenderDamage <= 0 || cover.coverer.stats.hp <= 0) {
        return { damage: defenderDamage };
    }

    const covererResult = DamageComposer.resolveKinds(
        components,
        defenceLayersOf(cover.coverer),
        kindMultiplierFor(cover.coverer),
        options,
    );

    const share = cover.percent / 100;
    const covererDamage = Math.round(covererResult.total * share * 100) / 100;
    const defenderShare = Math.round(defenderDamage * (1 - share) * 100) / 100;

    takeCoveredHit(cover.coverer, covererDamage);
    consumeCover(defender);

    return {
        damage: defenderShare,
        coverNote: `${cover.coverer.name} covers ${defender.name} (-${covererDamage})`,
    };
}

/**
 * The general attack resolution: base components, then every equipped
 * item's onAttack hook (so weapons can add, scale or duplicate damage
 * using the bearer's and target's stats), then merge, crits and
 * resolution. Physical components are reduced by defence, magical by
 * magicDefence, true by nothing; elemental affinities and resistances
 * apply on top. The damage math never mutates the defender's stats.
 * Only the onHit hooks (fired after reactions, and only when the final
 * damage is above 0) may apply side effects such as statuses — a Parry
 * that zeroes the damage skips them entirely. A Cover on the defender
 * redirects its share to the coverer (whose hp is the one mutation).
 */
export function resolveGeneralAttack(
    attacker: Character,
    defender: Character,
    random: () => number,
    options: ResolveOptions = {},
): GeneralAttackOutcome {
    // The base components: the attacker's own attack, or the payload a
    // reaction built (the counter-attack's components).
    let components = options.components ?? attackComponentsOf(attacker);

    if (!options.components) {
        for (const item of equippedItemsOf(attacker)) {
            const hook = item.definition.onAttack;
            if (hook) {
                components = hook({ attacker, defender, item, components });
            }
        }
    }

    // Impact hits: a basic attack applies exactly one. The bearer's
    // impact statuses (Sheen, Phantom Strike), per-impact item bonuses
    // (Guinsoo) and counter procs (Silver Bullets) react inside this
    // phase, before the components merge. Counter-attacks carry none.
    let appliedImpacts = 1;
    if (!options.isCounter) {
        appliedImpacts = resolveImpactHits({ attacker, defender, impactHits: 1, components, random });
    }

    const merged = mergeComponents(components);

    // Accuracy: at less than 100 the attack rolls to hit. A miss
    // consumes one random call and deals nothing (no crit roll, no
    // on-hit effects, no reactions). At the default 100 every attack
    // lands without consuming the roll. Counters always land.
    const accuracy = attacker.getStat('accuracy');
    if (!options.isCounter && accuracy < 100 && random() * 100 >= accuracy) {
        return { damage: 0, note: 'missed' };
    }

    // Evasion: even a perfectly aimed attack (skills carry 100%
    // accuracy) can be dodged by the defender. Counter-attacks always
    // land.
    const evasion = defender.getStat('evasion');
    if (!options.isCounter && evasion > 0 && random() * 100 < evasion) {
        return { damage: 0, note: 'evaded' };
    }

    const rolled = rollCrits(attacker, merged, random);

    const result = DamageComposer.resolveKinds(
        rolled.components,
        defenceLayersOf(defender),
        kindMultiplierFor(defender),
        options,
    );

    // Reactive pieces the defender carries fire when it is attacked.
    // The first piece that triggers wins; a triggered piece may negate
    // the hit and/or build a counter-attack back at the attacker.
    // Counters never trigger reactions themselves (no chains).
    let damage = result.total;
    let counter: GeneralAttackOutcome['counter'];
    const notes = [...rolled.notes];
    if (!options.isCounter) {
        for (const reaction of reactionsOf(defender)) {
            const outcome = reaction({
                attacker,
                defender,
                incomingDamage: damage,
                impactHits: appliedImpacts,
                random,
            });
            if (!outcome) continue;
            damage = outcome.damage;
            if (outcome.counter && outcome.counter.length > 0) {
                counter = { components: outcome.counter };
            }
            if (outcome.note) notes.push(outcome.note);
            break;
        }
    }

    // On-hit effects (Bleeding...) only apply when the attack dealt
    // real damage: reactions that block it (Parry sets damage to 0)
    // prevent them from ever running.
    if (damage > 0) {
        for (const item of equippedItemsOf(attacker)) {
            const hook = item.definition.onHit;
            if (hook) {
                hook({ attacker, defender, item, damage });
            }
        }
    }

    // A Cover on the defender redirects its share to the coverer
    // (consumed by this hit); the defender only suffers the rest. This
    // is the one place the resolution mutates anything, and it touches
    // the coverer, never the defender's stats.
    const redirect = applyCoverRedirect(defender, rolled.components, damage, options);
    damage = redirect.damage;
    if (redirect.coverNote) notes.push(redirect.coverNote);

    return {
        damage,
        counter,
        breakdown: options.breakdown ? result.breakdown : undefined,
        note: notes.length > 0 ? notes.join(' ') : undefined,
        // The assembled hit (post impact phase, pre merge): the tests
        // and logs inspect the separate instances (Attack, Sheen...).
        components: [...components],
    };
}

/**
 * Plugs the general attack into the interval engine: the engine applies
 * the returned damage to the defender (and the counter-attack damage to
 * the attacker) and shows the note in the log. The defender's counter
 * is resolved here as a real attack instance — mitigated by the
 * attacker's defence, crit-able — and delivered through the numeric
 * `reflect` seam the engines already apply. Every basic attack tires
 * the attacker (+5 fatigue, penalties at thresholds, faint at 100).
 */
export const generalAttackResolver: IntervalDamageResolver = (attacker, defender, random): IntervalDamage => {
    const outcome = resolveGeneralAttack(attacker, defender, random, { breakdown: true });
    gainFatigue(attacker, FATIGUE.gainPerAttack);
    // The Gate ramps only when the bearer actually attacks.
    rampGatePower(attacker);

    // The defender's counter-attack instance (Parry, Spike Shield).
    let reflect = 0;
    let reflectByKind: Partial<DamageKindTotals> | undefined;
    const notes: string[] = [];
    if (outcome.note) notes.push(outcome.note);
    if (outcome.counter) {
        const counter = resolveGeneralAttack(defender, attacker, random, {
            breakdown: true,
            isCounter: true,
            components: outcome.counter.components,
        });
        reflect = counter.damage;
        reflectByKind = kindTotalsOfBreakdown(counter.breakdown ?? []);
        if (counter.note) notes.push(counter.note);
    }

    return {
        damage: outcome.damage,
        byKind: kindTotalsOfBreakdown(outcome.breakdown ?? []),
        note: notes.length > 0 ? notes.join(' ') : undefined,
        reflect,
        reflectByKind,
    };
};
