// A marble bag: a stateful, without-replacement draw pile.
//
// A bag holds entries. An entry is either a direct outcome ("item") or a
// nested bag; drawing a nested bag resolves a draw from that inner bag and
// returns its outcome. When the bag empties it refills from its authored
// entries, so over a full cycle the authored proportions are guaranteed
// instead of merely likely. This is the stable behavior wanted for crits,
// evasion and drop tables.
//
// Example:
//   const crit = chanceBag(0.25, 'crit', 'hit', { name: 'Crit 25%' });
//   crit.draw(); // 'crit' | 'hit', exactly 25% crit per 100-marble cycle

export type MarbleItemEntry<T> = {
    item: T;
    label?: string;
    // Number of marbles this entry contributes to the bag (default 1).
    weight?: number;
};

export type MarbleNestedEntry<T> = {
    bag: MarbleBag<T>;
    label?: string;
    weight?: number;
};

export type MarbleEntry<T> = MarbleItemEntry<T> | MarbleNestedEntry<T>;

export type MarbleBagOptions = {
    name?: string;
    // Refill the bag from its authored entries when it empties (default
    // true). With refill disabled, draw() returns undefined once empty.
    refill?: boolean;
    // Injectable random source in [0, 1). Defaults to Math.random.
    rng?: () => number;
    // Defensive limit for cyclic nested bags.
    maxDepth?: number;
};

const DEFAULT_WEIGHT = 1;
const DEFAULT_MAX_DEPTH = 32;

function isNested<T>(entry: MarbleEntry<T>): entry is MarbleNestedEntry<T> {
    return 'bag' in entry;
}

function weightOf(entry: MarbleEntry<unknown>): number {
    const weight = entry.weight ?? DEFAULT_WEIGHT;
    if (!Number.isInteger(weight) || weight < 1) {
        throw new Error(`Marble weight must be a positive integer (got ${String(weight)}).`);
    }
    return weight;
}

export class MarbleBag<T> {
    readonly name: string;
    readonly refill: boolean;
    private readonly sources: MarbleEntry<T>[];
    private readonly rng: () => number;
    private readonly maxDepth: number;
    private marbles: MarbleEntry<T>[] = [];
    private draws = 0;
    private refills = 0;

    constructor(entries: readonly MarbleEntry<T>[], options: MarbleBagOptions = {}) {
        for (const entry of entries) {
            if (isNested(entry)) {
                if ('item' in entry) {
                    throw new Error('A marble entry cannot be both an item and a nested bag.');
                }
            } else if (!('item' in entry)) {
                throw new Error('A marble entry needs an item or a nested bag.');
            }
            weightOf(entry);
        }
        this.sources = [...entries];
        this.name = options.name ?? 'Marble bag';
        this.refill = options.refill ?? true;
        this.rng = options.rng ?? Math.random;
        this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
        this.marbles = this.buildMarbles();
    }

    /** Authored entries (not the current remaining marbles). */
    get entries(): readonly MarbleEntry<T>[] {
        return this.sources;
    }

    /** Marbles still in the bag before a refill. */
    get remaining(): number {
        return this.marbles.length;
    }

    /** Total marbles of one full cycle. */
    get size(): number {
        return this.sources.reduce((sum, entry) => sum + weightOf(entry), 0);
    }

    get drawCount(): number {
        return this.draws;
    }

    get refillCount(): number {
        return this.refills;
    }

    get isEmpty(): boolean {
        return this.marbles.length === 0;
    }

    /**
     * Draws one outcome. A nested bag resolves its own draw, so the
     * caller always receives a leaf outcome. Returns undefined only for
     * an empty bag (or an exhausted bag with refill disabled).
     */
    draw(): T | undefined {
        return this.drawAtDepth(0);
    }

    /** Draws several outcomes; stops when the bag cannot produce one. */
    drawMany(count: number): T[] {
        const results: T[] = [];
        for (let index = 0; index < count; index++) {
            const result = this.draw();
            if (result === undefined) break;
            results.push(result);
        }
        return results;
    }

    /** Rebuilds the pile from the authored entries and clears counters. */
    reset(): void {
        this.marbles = this.buildMarbles();
        this.draws = 0;
        this.refills = 0;
    }

    private buildMarbles(): MarbleEntry<T>[] {
        const marbles: MarbleEntry<T>[] = [];
        for (const entry of this.sources) {
            const weight = weightOf(entry);
            for (let count = 0; count < weight; count++) marbles.push(entry);
        }
        return marbles;
    }

    private drawAtDepth(depth: number): T | undefined {
        if (depth > this.maxDepth) {
            throw new Error(`Marble bag "${this.name}" nested too deeply (possible cycle).`);
        }
        // A nested bag can resolve to nothing (empty and no refill); in
        // that case keep drawing the remaining marbles instead of failing.
        for (let attempt = 0; attempt < this.maxDepth; attempt++) {
            if (this.marbles.length === 0) {
                if (!this.refill) return undefined;
                this.marbles = this.buildMarbles();
                this.refills += 1;
                if (this.marbles.length === 0) return undefined;
            }
            const index = Math.min(
                this.marbles.length - 1,
                Math.floor(this.rng() * this.marbles.length),
            );
            const picked = this.marbles.splice(index, 1)[0];
            this.draws += 1;
            if (!isNested(picked)) return picked.item;
            const nested = picked.bag.drawAtDepth(depth + 1);
            if (nested !== undefined) return nested;
        }
        return undefined;
    }
}

export type ChanceBagOptions = MarbleBagOptions & {
    // How many marbles make one probability cycle (default 100).
    granularity?: number;
};

/**
 * Builds a bag from a probability in [0, 1]: `chance * granularity`
 * success marbles and the rest failure marbles. Over one cycle the
 * success count is exact; the order is random.
 */
export function chanceBag<T>(
    chance: number,
    success: T,
    failure: T,
    options: ChanceBagOptions = {},
): MarbleBag<T> {
    if (!Number.isFinite(chance)) {
        throw new Error(`chanceBag needs a finite chance (got ${String(chance)}).`);
    }
    const granularity = options.granularity ?? 100;
    if (!Number.isInteger(granularity) || granularity < 1) {
        throw new Error(`chanceBag granularity must be a positive integer (got ${String(granularity)}).`);
    }
    const clamped = Math.min(1, Math.max(0, chance));
    const successes = Math.round(clamped * granularity);
    const entries: MarbleEntry<T>[] = [];
    if (successes > 0) {
        entries.push({ item: success, label: 'success', weight: successes });
    }
    if (successes < granularity) {
        entries.push({ item: failure, label: 'failure', weight: granularity - successes });
    }
    return new MarbleBag(entries, options);
}

/** Convenience wrapper for percentages (0..100). */
export function chanceBagFromPercent<T>(
    percent: number,
    success: T,
    failure: T,
    options: ChanceBagOptions = {},
): MarbleBag<T> {
    return chanceBag(percent / 100, success, failure, options);
}

/** A weighted item bag from plain (value, weight) rows. */
export function weightedBag<T>(
    entries: readonly { item: T; weight: number; label?: string }[],
    options: MarbleBagOptions = {},
): MarbleBag<T> {
    return new MarbleBag<T>(
        entries.map((entry) => ({ item: entry.item, weight: entry.weight, label: entry.label })),
        options,
    );
}
