import type { Character } from '../../../src';
import type { DamageComponent } from './composer';

// Reactive pieces carried by a character: they fire when the bearer is
// attacked. Skills (or any other system) attach these pieces; the damage
// resolver only invokes them, it never knows where they came from.

export type ReactionContext = {
    attacker: Character;
    defender: Character;
    // The damage the defender is about to take (already mitigated).
    incomingDamage: number;
    // How many impact hits the incoming attack applied: a reaction may
    // answer once per impact hit received (the Spike Shield).
    impactHits: number;
    random: () => number;
};

export type ReactionResult = {
    // Damage the defender actually takes (0 when the reaction negates).
    damage: number;
    // The counter-attack the defender builds back at the attacker: an
    // attack instance (components) resolved by whoever applies the hit
    // — mitigated by the attacker's defence, crit-able, full pipeline.
    counter?: DamageComponent[];
    // Flavour for logs, e.g. 'parried!'.
    note?: string;
};

// Returns null when the reaction does not trigger (e.g. a failed chance
// roll), so the next piece gets its turn.
export type ReactionHandler = (context: ReactionContext) => ReactionResult | null;

/**
 * Attaches a reactive piece to a character.
 */
export function addReaction(character: Character, handler: ReactionHandler): void {
    if (!character.reactions) character.reactions = [];
    character.reactions.push(handler);
}

/**
 * Removes a reactive piece from a character (by reference: each
 * attachment creates its own piece, so this can never remove another
 * system's piece).
 */
export function removeReaction(character: Character, handler: ReactionHandler): void {
    if (!character.reactions) return;
    character.reactions = character.reactions.filter((entry) => entry !== handler);
}

/**
 * The reactive pieces a character carries.
 */
export function reactionsOf(character: Character): ReactionHandler[] {
    return character.reactions ?? [];
}
