// ---------------------------------------------------------------------------
// Pure targeting/selection rules: the "if the skill is X, behave like Y"
// decisions, extracted from the UI so they can be unit-tested and reused
// by the battle AI. No React here.
// ---------------------------------------------------------------------------

export type SelectionKind = 'single' | 'wide' | 'multiHit' | 'prefilled';

export type SelectionRules = {
    kind: SelectionKind;
    // How many picks the selection needs to be valid.
    max: number;
};

/**
 * The selection semantics of a skill:
 * - count 0          → prefilled (all targets, locked panel)
 * - count 1          → single (pick one)
 * - count > 1        → wide (N distinct) or multiHit (N hits, stacks)
 */
export function selectionRulesOf(options: {
    targeting: string;
    count: number;
    poolSize: number;
    multiHit?: boolean;
}): SelectionRules {
    if (options.count === 0) return { kind: 'prefilled', max: options.poolSize };
    if (options.multiHit) return { kind: 'multiHit', max: options.count };
    if (options.count === 1) return { kind: 'single', max: 1 };
    return { kind: 'wide', max: options.count };
}

/**
 * The next selection after tapping a target id. Pure: never mutates.
 * - single/wide: toggle membership, capped at max.
 * - multiHit: stack one more hit on the target; at the cap the next
 *   tap resets that target's hits to none.
 * - prefilled: locked, unchanged.
 */
export function toggleTarget(selection: string[], id: string, rules: SelectionRules): string[] {
    if (rules.kind === 'prefilled') return selection;

    if (rules.kind === 'multiHit') {
        const hits = selection.filter((entry) => entry === id).length;
        if (hits >= rules.max) return selection.filter((entry) => entry !== id);
        if (selection.length >= rules.max) return selection;
        return [...selection, id];
    }

    const has = selection.indexOf(id) !== -1;
    if (has) return selection.filter((entry) => entry !== id);
    if (selection.length >= rules.max) return selection;
    return [...selection, id];
}

/** Whether the floating accept should appear for this selection. */
export function isValidSelection(selection: string[], rules: SelectionRules): boolean {
    return selection.length === rules.max;
}

/** How many hits a target carries in the current selection. */
export function hitsOn(selection: string[], id: string): number {
    return selection.filter((entry) => entry === id).length;
}
