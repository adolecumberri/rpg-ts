// Fixed values that decide how the interval battle grid renders for a
// given team size. The web layer reads these; the engine never does.

export const BATTLE_LAYOUT = {
    // Column tiers: a side with more fighters gets more columns, so the
    // squares shrink and the whole team always fits on the page without
    // any sideways scrolling.
    columns: [
        { upTo: 3, columns: 2 },
        { upTo: 6, columns: 3 },
        { upTo: 10, columns: 4 },
        { upTo: 30, columns: 5 },
    ],
    // Crowds bigger than the last tier stop adding columns and add rows
    // instead.
    maxColumns: 6,
} as const;

/**
 * How many grid columns a side with `count` fighters should use.
 */
export function columnsFor(count: number): number {
    for (const tier of BATTLE_LAYOUT.columns) {
        if (count <= tier.upTo) return tier.columns;
    }
    return BATTLE_LAYOUT.maxColumns;
}
