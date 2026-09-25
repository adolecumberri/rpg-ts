// The story memory: a set of flags the session owns. Missions write
// into it when their reward steps complete; world events (a character
// dying or surviving, a decision) can write into it too. Content asks
// it "did X happen?" with the FLAGS constants.

export class FlagRegistry {
    private flags = new Set<string>();

    /** Leaves a flag (idempotent). */
    set(flag: string): void {
        this.flags.add(flag);
    }

    has(flag: string): boolean {
        return this.flags.has(flag);
    }

    all(): string[] {
        return Array.from(this.flags);
    }

    /** Restores the registry from a save. */
    restore(flags: string[]): void {
        this.flags = new Set(flags);
    }
}
