import type { Character } from '../../../src';
import { StatusInstance } from '../../../src/classes/StatusInstance';
import { gateOpenedStatus } from '../statuses';

// ---------------------------------------------------------------------------
// Ramping statuses: a status whose internal counter (its `stacks`)
// grows with events — here, the Gate Opened status gains one stack per
// attack and rebuilds its modifiers from the new value. The ramp only
// fires while the status is active, and only on attacks.
// ---------------------------------------------------------------------------

export const GATE_STATUS_ID = 'gate_opened';

// The Gate ramp caps: +8 attack / +2 speed per stack, 5 stacks max.
export const GATE_RAMP = {
    maxStacks: 5,
} as const;

/**
 * Called after every basic attack of a character: if the Gate is open,
 * its stack counter grows by one (capped) and the status is re-applied
 * with the rebuilt modifiers (+10 defence +8 attack +2 speed per stack).
 * No-op for characters without the Gate. The status is found by name so
 * it works however it was applied (skill, direct status...).
 */
export function rampGatePower(character: Character): void {
    const current = Array.from(character.statusManager.statuses.values())
        .find((status) => status.definition.name === 'Gate Opened');
    if (!current) return;

    const stacks = Math.min(GATE_RAMP.maxStacks, (current.definition.stacks ?? 0) + 1);
    character.statusManager.addStatusInstance(
        new StatusInstance({ id: GATE_STATUS_ID, definition: gateOpenedStatus(stacks) }),
    );
}
