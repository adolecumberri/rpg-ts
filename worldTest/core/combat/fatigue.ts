import type { Character } from '../../../src';
import type { AffectedStatDescriptor, StatusDefinition } from '../../../src/classes/StatusInstance';
import { StatusInstance } from '../../../src/classes/StatusInstance';
import { faintStatus } from '../statuses';

// ---------------------------------------------------------------------------
// The fatigue system. Fatigue is a mutable stat on the character (like
// hp); a single Fatigue status carries the scaling penalties. The
// status's modifiers are recomputed from the internal fatigue value on
// every change, so it is the "status with an internal variable": one
// instance whose variations grow with the number.
// ---------------------------------------------------------------------------

export const FATIGUE: {
    // Master switch: when false the whole system is inert — attacks
    // accumulate nothing, no penalties, no faint, and the fatigue UI
    // is hidden. Flip it to true to re-enable.
    enabled: boolean;
    gainPerAttack: number;
    faintAt: number;
    faintDuration: number;
    attackPercentPer5: number;
    defencePercentPer10: number;
    accuracyPer10: number;
    speedPer15: number;
} = {
    enabled: false,
    // Fatigue gained per basic attack.
    gainPerAttack: 5,
    // Reaching this value knocks the character out.
    faintAt: 100,
    // How many of the character's own turns the faint lasts.
    faintDuration: 2,
    // The penalty table, as rates per N fatigue:
    //   every 5 fatigue:  attack -5%
    //   every 10 fatigue: defence -10%
    //   every 10 fatigue: accuracy -10
    //   every 15 fatigue: speed -1
    attackPercentPer5: 5,
    defencePercentPer10: 10,
    accuracyPer10: 10,
    speedPer15: 1,
};

// The faint status instance id (the engines skip fainted fighters).
export const FAINT_ID = 'faint';
// The scaling fatigue status instance id.
export const FATIGUE_STATUS_ID = 'fatigue';

export function fatigueOf(character: Character): number {
    return character.getStat('fatigue');
}

/**
 * The modifiers the fatigue value currently produces, following the
 * per-N table (steps of the table unit: floor(fatigue / N) × rate).
 */
export function fatigueModifiers(fatigue: number): AffectedStatDescriptor[] {
    if (fatigue <= 0) return [];
    const modifiers: AffectedStatDescriptor[] = [
        {
            from: 'attack',
            to: 'attack',
            value: Math.floor(fatigue / 5) * FATIGUE.attackPercentPer5,
            typeOfModification: 'DEBUFF_PERCENTAGE',
        },
        {
            from: 'defence',
            to: 'defence',
            value: Math.floor(fatigue / 10) * FATIGUE.defencePercentPer10,
            typeOfModification: 'DEBUFF_PERCENTAGE',
        },
        {
            from: 'accuracy',
            to: 'accuracy',
            value: Math.floor(fatigue / 10) * FATIGUE.accuracyPer10,
            typeOfModification: 'DEBUFF_FIXED',
        },
        {
            from: 'speed',
            to: 'speed',
            value: Math.floor(fatigue / 15) * FATIGUE.speedPer15,
            typeOfModification: 'DEBUFF_FIXED',
        },
    ];
    return modifiers.filter((modifier) => modifier.value > 0);
}

/**
 * Re-applies the Fatigue status with the modifiers the current fatigue
 * value produces. The instance keeps a fixed id, so every re-apply
 * replaces the previous one: the status itself carries the internal
 * value and its variations grow with it.
 */
export function refreshFatigueStatus(character: Character): void {
    const modifiers = fatigueModifiers(character.stats.fatigue);
    if (modifiers.length === 0) {
        character.statusManager.removeStatusInstance(FATIGUE_STATUS_ID);
        return;
    }
    const definition: StatusDefinition = {
        name: 'Fatigue',
        // No static description: the tooltip derives the CURRENT
        // debuffs from statsAffected, so it always shows exactly what
        // the fighter is suffering right now.
        applyOn: 'after_turn',
        duration: { type: 'PERMANENT' },
        usageFrequency: 'PER_ACTION',
        triggersOnAdd: true,
        statsAffected: modifiers,
    };
    character.statusManager.addStatusInstance(
        new StatusInstance({ definition, id: FATIGUE_STATUS_ID }),
    );
}

/** Adds fatigue (clamped at 0) and re-evaluates the penalties. */
export function gainFatigue(character: Character, amount: number): boolean {
    if (!FATIGUE.enabled) return false;
    character.stats.fatigue = Math.max(0, character.stats.fatigue + amount);
    return syncFatigue(character);
}

/** Removes fatigue (clamped at 0) and re-evaluates the penalties. */
export function restoreFatigue(character: Character, amount: number): void {
    if (!FATIGUE.enabled) return;
    character.stats.fatigue = Math.max(0, character.stats.fatigue - amount);
    syncFatigue(character);
}

/**
 * Re-applies the scaling Fatigue status to the character. At 100
 * fatigue the character faints for 2 of its own turns and the fatigue
 * resets to 0. When the system is disabled, any leftover fatigue status
 * is cleaned up and nothing else happens.
 */
export function syncFatigue(character: Character): boolean {
    if (!FATIGUE.enabled) {
        character.statusManager.removeStatusInstance(FATIGUE_STATUS_ID);
        return false;
    }
    if (character.stats.fatigue >= FATIGUE.faintAt) {
        character.stats.fatigue = 0;
        character.statusManager.removeStatusInstance(FATIGUE_STATUS_ID);
        character.statusManager.addStatusInstance(
            new StatusInstance({ definition: faintStatus(), id: FAINT_ID }),
        );
        return true;
    }

    refreshFatigueStatus(character);
    return false;
}

/**
 * Consumes one action attempt of a fainted character: triggers the
 * on_turn moment (the faint duration counts down) and reports whether
 * the character is still fainted, in which case the caller must skip
 * its action. Checking BEFORE the trigger makes a 2-turn faint skip
 * exactly two of the character's own actions.
 */
export function consumeFaintTurn(character: Character): boolean {
    const fainted = character.statusManager.hasStatus(FAINT_ID);
    character.statusManager.trigger('on_turn');
    return fainted;
}
