import type { Character } from '../../../src';
import { StatusInstance } from '../../../src/classes/StatusInstance';
import { coveredStatus } from '../statuses';

// ---------------------------------------------------------------------------
// Cover: a paladin-like protection. The skill applies a Covered status to
// an ALLY; while it holds, the next non-status hit the ally receives is
// split — the coverer takes the covered share (through its own
// mitigation) and the status is consumed. The status itself carries the
// coverer and the percent, so no other registry is needed, and because
// the status system replaces same-name statuses, only the last Cover on
// a character is ever in effect.
// ---------------------------------------------------------------------------

export type ActiveCover = {
    instance: StatusInstance;
    coverer: Character;
    percent: number;
};

/**
 * Covers an ally: applies the Covered status (refreshing any previous
 * cover on that ally, so the last one wins) and returns the instance.
 */
export function applyCover(ally: Character, coverer: Character, percent: number): StatusInstance {
    const instance = new StatusInstance({
        definition: coveredStatus(coverer, percent),
    });
    ally.statusManager.addStatusInstance(instance);
    return instance;
}

/**
 * The cover currently protecting the ally, if any. Derived from the
 * live statuses, so a dispel or the battle-end cleanup makes it
 * disappear on its own.
 */
export function coverOf(ally: Character): ActiveCover | undefined {
    for (const status of ally.statusManager.statuses.values()) {
        const cover = status.definition.cover;
        if (!cover) continue;
        return { instance: status, coverer: cover.coverer, percent: cover.percent };
    }
    return undefined;
}

/**
 * Consumes the ally's cover (after a redirected hit): removes the
 * status. Returns whether there was one to consume.
 */
export function consumeCover(ally: Character): boolean {
    const cover = coverOf(ally);
    if (!cover) return false;
    ally.statusManager.removeStatusInstance(cover.instance.id);
    return true;
}

/**
 * Applies the redirected share to the coverer's hp (clamped at 0).
 */
export function takeCoveredHit(coverer: Character, amount: number): void {
    coverer.stats.hp = Math.max(0, coverer.stats.hp - amount);
    coverer.stats.isAlive = coverer.stats.hp > 0 ? 1 : 0;
}
