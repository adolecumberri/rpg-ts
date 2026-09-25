// Place event loops: a hunt searches a place iteration by iteration,
// with per-encounter chances that can grow between iterations.

export type HuntEncounter = {
    id: string;
    label: string;
    // Current chance (0-100) of hitting this encounter per iteration.
    chancePercent: number;
    // How much the chance grows after every iteration (cow: +5).
    growPercent?: number;
    // Upper bound for the grown chance (defaults to 100).
    capPercent?: number;
    // Group size when the encounter spawns (goblins: 1-3). Defaults to 1.
    minCount?: number;
    maxCount?: number;
};

export type HuntResult =
    | { kind: 'nothing' }
    | { kind: 'hit'; encounterId: string; count: number };

/**
 * The search loop. Encounters roll in definition order and the first
 * hit wins; chances grow after every iteration. The random source is
 * injected so hunts stay deterministic in tests.
 */
export class Hunt {
    private encounters: HuntEncounter[];
    private random: () => number;
    private iterations = 0;

    constructor(encounters: HuntEncounter[], random: () => number) {
        // Own copies: a hunt's growing chances never leak into the
        // shared mission config.
        this.encounters = encounters.map((entry) => ({ ...entry }));
        this.random = random;
    }

    iterationsDone(): number {
        return this.iterations;
    }

    chanceOf(encounterId: string): number {
        const entry = this.encounters.find((candidate) => candidate.id === encounterId);
        return entry?.chancePercent ?? 0;
    }

    encountersOf(): HuntEncounter[] {
        return this.encounters.map((entry) => ({ ...entry }));
    }

    /**
     * One search iteration: rolls every encounter (definition order,
     * first hit wins) and then grows the chances.
     */
    iterate(): HuntResult {
        this.iterations++;

        let result: HuntResult = { kind: 'nothing' };
        for (const encounter of this.encounters) {
            const roll = this.random() * 100;
            if (roll >= encounter.chancePercent) continue;

            const min = encounter.minCount ?? 1;
            const max = encounter.maxCount ?? min;
            const count = min + Math.floor(this.random() * (max - min + 1));
            result = { kind: 'hit', encounterId: encounter.id, count };
            break;
        }

        for (const encounter of this.encounters) {
            const cap = encounter.capPercent ?? 100;
            encounter.chancePercent = Math.min(cap, encounter.chancePercent + (encounter.growPercent ?? 0));
        }

        return result;
    }

    /**
     * Restores a saved hunt state (used by the mission save system).
     */
    restoreState(iterations: number, chances: { encounterId: string; chancePercent: number }[]): void {
        this.iterations = iterations;
        for (const chance of chances) {
            const entry = this.encounters.find((candidate) => candidate.id === chance.encounterId);
            if (entry) entry.chancePercent = chance.chancePercent;
        }
    }
}
