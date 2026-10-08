// The attack reach dictionary (RANGES.short). Weapons grant one of
// these reaches to their bearer.

export const RANGES = {
    short: 'short',
    long: 'long',
    all: 'all',
} as const;

export type RangeId = typeof RANGES[keyof typeof RANGES];
