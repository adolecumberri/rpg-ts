import type { AutoCondition, ConditionInput } from '../combat/conditions';
import { describeCondition } from '../combat/conditions';

// ---------------------------------------------------------------------------
// Named conditions: content references them by id from a skill's auto
// policy instead of repeating the descriptor, so conditions are
// identifiable and reusable. Inline descriptors are still allowed.
// ---------------------------------------------------------------------------
export const AUTO_CONDITIONS: Record<string, AutoCondition> = {
    selfHpBelowHalf: {
        id: 'selfHpBelowHalf',
        subject: 'self',
        stat: 'hp',
        compare: 'below',
        value: 50,
        valueType: 'percent',
    },
    lowestAllyHpBelowQuarter: {
        id: 'lowestAllyHpBelowQuarter',
        subject: 'ally',
        match: 'lowest',
        stat: 'hp',
        compare: 'below',
        value: 25,
        valueType: 'percent',
    },
};

/**
 * Resolves a condition input to a full descriptor. Unknown references
 * throw: content errors surface when the policy is first evaluated.
 */
export function resolveCondition(input: ConditionInput): AutoCondition {
    if ('ref' in input) {
        const resolved = AUTO_CONDITIONS[input.ref];
        if (!resolved) {
            throw new Error(`Unknown auto condition reference: ${input.ref}`);
        }
        return resolved;
    }
    return input;
}

/**
 * Human text for a condition input, safe for dev tools: unknown
 * references describe themselves instead of throwing.
 */
export function describeConditionInput(input: ConditionInput): string {
    try {
        return describeCondition(resolveCondition(input));
    } catch {
        return 'ref' in input ? `unknown ref: ${input.ref}` : describeCondition(input);
    }
}
