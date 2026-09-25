import type { Character } from '../../../src';
import { positionTauntMultiplier } from '../../../src/constants/team.constants';

// ---------------------------------------------------------------------------
// Weighted target picking for auto battles. The library's IntervalCombat
// carries the same logic inline (it cannot depend on worldTest); the
// hybrid engine and the turn-based enemy AI share this copy, so the
// three targeting flows always agree.
// ---------------------------------------------------------------------------

/**
 * The targeting weight of a defender: its `taunt` stat multiplied by
 * its formation row (front ×3, center ×2, back ×1). Missing or
 * non-positive taunt values fall back to 1 before the row multiplies
 * them, so everyone in the same row is equally likely to be hit unless
 * content says otherwise.
 */
export function tauntOf(character: Character): number {
    const value = character.getStat('taunt');
    const base = Number.isFinite(value) && value > 0 ? value : 1;
    return base * positionTauntMultiplier(character.position);
}

/**
 * Picks one alive defender weighted by taunt: probability
 * taunt / (sum of the team's taunt). The denominator is always the
 * total of the alive team passed in. With every taunt at 1 this is the
 * classic uniform pick (and consumes exactly one random call, like the
 * plain uniform pick did).
 */
export function pickWeightedTarget(pool: Character[], random: () => number): Character | undefined {
    if (pool.length === 0) return undefined;
    if (pool.length === 1) return pool[0];

    const totalTaunt = pool.reduce((sum, character) => sum + tauntOf(character), 0);
    let roll = random() * totalTaunt;
    for (const character of pool) {
        roll -= tauntOf(character);
        if (roll < 0) return character;
    }
    return pool[pool.length - 1];
}

/**
 * Picks `count` distinct defenders, weighted by taunt and sampled
 * without replacement (the remaining pool's weights renormalize after
 * every pick).
 */
export function pickWeightedTargets(pool: Character[], count: number, random: () => number): Character[] {
    const remaining = [...pool];
    const picked: Character[] = [];
    const amount = Math.min(Math.max(1, count), remaining.length);

    for (let index = 0; index < amount; index++) {
        if (remaining.length === 1) {
            picked.push(remaining[0]);
            break;
        }
        const chosen = pickWeightedTarget(remaining, random);
        if (!chosen) break;
        picked.push(chosen);
        const chosenIndex = remaining.indexOf(chosen);
        if (chosenIndex !== -1) remaining.splice(chosenIndex, 1);
    }
    return picked;
}
