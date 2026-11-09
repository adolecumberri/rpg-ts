import type { Character } from '../Character';

/**
 * Battle-scoped life state that is not a Character stat: the barrier pool
 * and the turns left before it expires. It is reset when a battle starts
 * or ends, so it never leaks between fights.
 */
export type CombatVitals = {
    barrier: number;
    barrierTurns: number;
};

export const EMPTY_VITALS: CombatVitals = {
    barrier: 0,
    barrierTurns: 0,
};

export type VitalsDamageKind = 'physical' | 'magical' | 'true';

/**
 * One post-mitigation damage component. `barrierMultiplier` is the
 * weapon/skill "+X% on barriers" modifier; it only applies when the target
 * actually has a barrier. `onHit` marks damage that can feed lifesteal.
 */
export type VitalsDamageComponent = {
    amount: number;
    kind: VitalsDamageKind;
    barrierMultiplier?: number;
    onHit?: boolean;
};

export type VitalsDamageRecipe = {
    components: VitalsDamageComponent[];
    attacker?: Character;
};

export type VitalsDamageRecord = {
    baseTotal: number;
    effectiveTotal: number;
    barrierAbsorbed: number;
    hpDamage: number;
    lethal: boolean;
    lifestealRequested: number;
    lifestealApplied: number;
    absorptionRequested: number;
    absorptionApplied: number;
    healingReduced: number;
    barrierAfter: number;
};

export type VitalsHealRecord = {
    requested: number;
    reduced: number;
    applied: number;
};

const ZERO_DAMAGE_RECORD: VitalsDamageRecord = {
    baseTotal: 0,
    effectiveTotal: 0,
    barrierAbsorbed: 0,
    hpDamage: 0,
    lethal: false,
    lifestealRequested: 0,
    lifestealApplied: 0,
    absorptionRequested: 0,
    absorptionApplied: 0,
    healingReduced: 0,
    barrierAfter: 0,
};

function statOf(character: Character, stat: string): number {
    return character.getStat(stat as never) ?? 0;
}

/** The current barrier amount. */
export function barrierOf(character: Character): number {
    return character.vitals.barrier;
}

/**
 * Grant a barrier. A positive grant is reduced by the receiver's
 * barrier-gain reduction (Broken Barrier), added to the existing pool and
 * resets the whole pool timer to two turns. Returns the amount actually
 * added (0 means the grant did not refresh the timer).
 */
export function grantBarrier(character: Character, baseAmount: number): number {
    if (!(baseAmount > 0)) return 0;
    const reduction = Math.max(0, Math.min(100, statOf(character, 'barrierGainReductionPercent')));
    const granted = Math.round(baseAmount * (1 - reduction / 100));
    if (granted <= 0) return 0;
    character.vitals.barrier += granted;
    character.vitals.barrierTurns = 2;
    return granted;
}

/**
 * Tick the barrier timer at the end of its owner's action. The pool is
 * cleared when the two granted turns are spent.
 */
export function tickBarrier(character: Character): boolean {
    if (character.vitals.barrier <= 0) {
        character.vitals.barrier = 0;
        character.vitals.barrierTurns = 0;
        return false;
    }
    character.vitals.barrierTurns -= 1;
    if (character.vitals.barrierTurns <= 0) {
        character.vitals.barrier = 0;
        character.vitals.barrierTurns = 0;
        return true;
    }
    return false;
}

/** Clear barrier state at battle start or teardown. */
export function resetVitals(character: Character): void {
    character.vitals.barrier = 0;
    character.vitals.barrierTurns = 0;
}

/**
 * Apply healing through one entry point. Healing never resurrects, is
 * reduced by Herida grave (healingReductionPercent), caps at max HP and
 * rounds once at the HP write.
 */
export function applyHeal(character: Character, requested: number): VitalsHealRecord {
    if (!(requested > 0) || character.stats.hp <= 0) {
        return { requested, reduced: 0, applied: 0 };
    }
    const reduction = Math.max(0, Math.min(100, statOf(character, 'healingReductionPercent')));
    const afterReduction = requested * (1 - reduction / 100);
    const missing = Math.max(0, character.stats.totalHp - character.stats.hp);
    const applied = Math.max(0, Math.min(Math.round(afterReduction), Math.round(missing)));
    if (applied > 0) {
        character.stats.hp += applied;
        character.stats.isAlive = 1;
    }
    return {
        requested,
        reduced: Math.max(0, requested - afterReduction),
        applied,
    };
}

/**
 * Apply a damage recipe through one entry point. Barrier absorbs first,
 * then HP is written, then lifesteal and absorption run through
 * applyHeal. Barrier-absorbed and overkill damage still feed lifesteal
 * and absorption because the post-mitigation component totals are used.
 */
export function applyDamage(target: Character, recipe: VitalsDamageRecipe): VitalsDamageRecord {
    const components = recipe.components.filter((component) => component.amount > 0);
    if (components.length === 0) {
        return { ...ZERO_DAMAGE_RECORD, barrierAfter: target.vitals.barrier };
    }
    if (target.stats.hp <= 0) {
        return { ...ZERO_DAMAGE_RECORD, barrierAfter: target.vitals.barrier };
    }

    const baseTotal = components.reduce((sum, component) => sum + component.amount, 0);
    const hasBarrier = target.vitals.barrier > 0;
    const effectiveTotal = components.reduce((sum, component) =>
        sum + component.amount * (hasBarrier ? (component.barrierMultiplier ?? 1) : 1), 0);

    let barrierAbsorbed = 0;
    let hpRaw = baseTotal;
    if (hasBarrier && effectiveTotal > 0) {
        barrierAbsorbed = Math.min(target.vitals.barrier, effectiveTotal);
        target.vitals.barrier -= barrierAbsorbed;
        if (target.vitals.barrier <= 0) {
            target.vitals.barrier = 0;
            target.vitals.barrierTurns = 0;
        }
        hpRaw = baseTotal * (1 - barrierAbsorbed / effectiveTotal);
    }

    const hpDamage = Math.max(0, Math.round(hpRaw));
    target.stats.hp = Math.max(0, target.stats.hp - hpDamage);
    target.stats.isAlive = target.stats.hp > 0 ? 1 : 0;
    const lethal = target.stats.hp <= 0;

    const onHitPhysical = components
        .filter((component) => component.onHit && component.kind === 'physical')
        .reduce((sum, component) => sum + component.amount, 0);
    const lifestealRequested = recipe.attacker && recipe.attacker.stats.hp > 0 ?
        onHitPhysical * statOf(recipe.attacker, 'lifestealPercent') / 100 :
        0;
    let lifestealApplied = 0;
    let lifestealReduced = 0;
    if (lifestealRequested > 0 && recipe.attacker) {
        const heal = applyHeal(recipe.attacker, lifestealRequested);
        lifestealApplied = heal.applied;
        lifestealReduced = heal.reduced;
    }

    const absorptionRequested = !lethal ?
        baseTotal * statOf(target, 'absorptionPercent') / 100 :
        0;
    let absorptionApplied = 0;
    let absorptionReduced = 0;
    if (absorptionRequested > 0) {
        const heal = applyHeal(target, absorptionRequested);
        absorptionApplied = heal.applied;
        absorptionReduced = heal.reduced;
    }

    return {
        baseTotal,
        effectiveTotal,
        barrierAbsorbed,
        hpDamage,
        lethal,
        lifestealRequested,
        lifestealApplied,
        absorptionRequested,
        absorptionApplied,
        healingReduced: lifestealReduced + absorptionReduced,
        barrierAfter: target.vitals.barrier,
    };
}
