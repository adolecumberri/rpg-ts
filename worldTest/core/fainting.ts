// ---------------------------------------------------------------------------
// Fainting: what happens to a teammate that falls in battle. The downed
// character is left behind as a corpse at the battle place; a party
// member can pick the corpse up (one per carrier, with the persistent
// Corpse Carrying penalties) and travel to a place with a Fountain to
// revive it. A corpse left in a place for a week means the character is
// dead for good.
// ---------------------------------------------------------------------------

import type { Character } from '../../src';
import { StatusInstance } from '../../src/classes/StatusInstance';
import { corpseCarryingStatus } from './statuses';

export const FAINT = {
    // Days a corpse waits in a place before its owner dies for good.
    corpseDays: 7,
} as const;

export type FaintedEntry = {
    characterId: string;
    // Where the corpse lies (ignored while someone carries it).
    placeId: string;
    // The calendar day the character fell.
    day: number;
    // Who is hauling the corpse right now (undefined = it lies where
    // the character fell).
    carriedBy?: string;
};

/**
 * The session-level record of fallen characters. The character itself
 * stays in the roster (its data is intact for the revival); this
 * registry only tracks where the corpse is, since when, and who
 * carries it.
 */
export class FaintRegistry {
    private entries = new Map<string, FaintedEntry>();
    // Characters whose corpses waited too long: dead for good.
    private deceased = new Set<string>();

    /** The fallen character is left at the given place on the given day. */
    faint(characterId: string, placeId: string, day: number): void {
        if (this.deceased.has(characterId)) return;
        this.entries.set(characterId, { characterId, placeId, day });
    }

    has(characterId: string): boolean {
        return this.entries.has(characterId);
    }

    get(characterId: string): FaintedEntry | undefined {
        return this.entries.get(characterId);
    }

    isDeceased(characterId: string): boolean {
        return this.deceased.has(characterId);
    }

    all(): FaintedEntry[] {
        return Array.from(this.entries.values());
    }

    /** The corpse a carrier is hauling, if any. */
    carriedBy(carrierId: string): FaintedEntry | undefined {
        for (const entry of this.entries.values()) {
            if (entry.carriedBy === carrierId) return entry;
        }
        return undefined;
    }

    /** How many days the corpse has before the character dies. */
    daysLeft(characterId: string, today: number): number {
        const entry = this.entries.get(characterId);
        if (!entry) return 0;
        return FAINT.corpseDays - (today - entry.day);
    }

    /** Corpses lying at a place (carried ones travel with the party). */
    at(placeId: string): FaintedEntry[] {
        return Array.from(this.entries.values())
            .filter((entry) => !entry.carriedBy && entry.placeId === placeId);
    }

    /**
     * A carrier picks the corpse up. The caller enforces the one-corpse
     * limit through `carriedBy`; this only records the link.
     */
    carry(characterId: string, carrierId: string): void {
        const entry = this.entries.get(characterId);
        if (!entry) return;
        entry.carriedBy = carrierId;
    }

    /** Drops the carried corpse back where the party stands now. */
    drop(characterId: string, placeId: string): void {
        const entry = this.entries.get(characterId);
        if (!entry) return;
        entry.carriedBy = undefined;
        entry.placeId = placeId;
    }

    /** The fountain revived the character: the record is cleared. */
    revive(characterId: string): void {
        this.entries.delete(characterId);
    }

    /**
     * The week ran out: returns the characters whose corpses expired by
     * the given day and removes them from the records.
     */
    expire(today: number): string[] {
        const expired: string[] = [];
        for (const [id, entry] of this.entries) {
            if (today - entry.day < FAINT.corpseDays) continue;
            expired.push(id);
            this.deceased.add(id);
        }
        for (const id of expired) this.entries.delete(id);
        return expired;
    }

    snapshot(): FaintedEntry[] {
        return this.all().map((entry) => ({ ...entry }));
    }

    deceasedIds(): string[] {
        return Array.from(this.deceased);
    }

    restore(entries: FaintedEntry[], deceased: string[]): void {
        this.entries = new Map(entries.map((entry) => [entry.characterId, { ...entry }]));
        this.deceased = new Set(deceased);
    }
}

/**
 * Applies the Corpse Carrying status to the carrier: the penalties that
 * follow the character between battles (persistent). Idempotent, and
 * used again on save/load because statuses are not serialized.
 */
export function applyCarryStatus(carrier: Character): void {
    for (const status of carrier.statusManager.statuses.values()) {
        if (status.definition.name === 'Corpse Carrying') return;
    }
    carrier.statusManager.addStatusInstance(
        new StatusInstance({ definition: corpseCarryingStatus() }),
    );
}

/**
 * The corpse was laid down (revived or dropped): the carry penalties
 * go away.
 */
export function clearCarryStatus(carrier: Character): void {
    for (const [id, status] of carrier.statusManager.statuses) {
        if (status.definition.name === 'Corpse Carrying') {
            carrier.statusManager.removeStatusInstance(id);
        }
    }
}
