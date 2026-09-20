import type { Character } from '../../../src';

// Fixed values of the speed system. One stat drives both the turn order
// of the turn-based combat and the attack frequency of the interval
// battle, so there is never a second number to keep in sync.
export const SPEED = {
    // Interval battle conversion: interval = ceil(scale / speed).
    // speed 8 -> 3 ticks, 6 -> 4, 5 -> 5, 4 -> 6, 12 -> 2.
    intervalScale: 24,
    // A speed no lower than this always gives the minimum interval of 1.
    minInterval: 1,
} as const;

/**
 * The attack interval a fighter gets from its speed in the interval
 * battle: faster fighters act on lower multiples of the global tick.
 */
export function intervalFromSpeed(speed: number): number {
    const safeSpeed = Math.max(1, speed);
    return Math.max(SPEED.minInterval, Math.ceil(SPEED.intervalScale / safeSpeed));
}

/**
 * Turn order comparator: higher speed acts first; ties break by name so
 * the order is deterministic. Skill/item priority is layered on top by
 * the combat (not implemented yet).
 */
export function compareBySpeed(a: Character, b: Character): number {
    return b.getStat('speed') - a.getStat('speed') || a.name.localeCompare(b.name);
}
