import type { IntervalActionRecord } from '../../../src/classes/Combat/IntervalCombat';
import type { HybridAutoEvent } from './hybridCombat';
import type { ComponentLine } from '../damage/composer';
import { kindOfElement } from '../config/damage';

// ---------------------------------------------------------------------------
// The battle tracker: a battle-scoped ledger of what each fighter did.
// Attach it to an engine through its optional observer (IntervalCombat's
// onAction / HybridCombat's onAction) or feed it manually from the
// turn-based flow; afterwards `report()` answers "who dealt/received
// what" per damage kind, healing and kills.
// ---------------------------------------------------------------------------

export type DamageKindTotals = {
    physical: number;
    magical: number;
    true: number;
};

export type BattleFighterStats = {
    damageDealt: DamageKindTotals;
    damageReceived: DamageKindTotals;
    healingGiven: number;
    healingReceived: number;
    kills: number;
};

export type BattleReport = Array<{
    id: string;
    stats: BattleFighterStats;
}>;

/** Sums a resolved breakdown's final damage per kind. */
export function kindTotalsOfBreakdown(lines: ComponentLine[]): Partial<DamageKindTotals> {
    const totals: Partial<DamageKindTotals> = {};
    for (const line of lines) {
        const kind = kindOfElement(line.element);
        totals[kind] = (totals[kind] ?? 0) + line.final;
    }
    return totals;
}

function emptyTotals(): DamageKindTotals {
    return { physical: 0, magical: 0, true: 0 };
}

function emptyStats(): BattleFighterStats {
    return {
        damageDealt: emptyTotals(),
        damageReceived: emptyTotals(),
        healingGiven: 0,
        healingReceived: 0,
        kills: 0,
    };
}

export class BattleTracker {
    private stats = new Map<string, BattleFighterStats>();

    private of(id: string): BattleFighterStats {
        let entry = this.stats.get(id);
        if (!entry) {
            entry = emptyStats();
            this.stats.set(id, entry);
        }
        return entry;
    }

    private add(target: DamageKindTotals, byKind: Partial<DamageKindTotals> | undefined, fallback: number): void {
        if (byKind) {
            target.physical += byKind.physical ?? 0;
            target.magical += byKind.magical ?? 0;
            target.true += byKind.true ?? 0;
        } else {
            target.physical += fallback;
        }
    }

    /** Records applied damage: dealt by the actor, received by the target. */
    recordHit(actorId: string, targetId: string, damage: number, byKind?: Partial<DamageKindTotals>): void {
        if (damage <= 0) return;
        this.add(this.of(actorId).damageDealt, byKind, damage);
        this.add(this.of(targetId).damageReceived, byKind, damage);
    }

    /** Records a heal: given by the actor, received by the target. */
    recordHeal(actorId: string, targetId: string, amount: number): void {
        if (amount <= 0) return;
        this.of(actorId).healingGiven += amount;
        this.of(targetId).healingReceived += amount;
    }

    recordKill(actorId: string): void {
        this.of(actorId).kills += 1;
    }

    statsOf(id: string): BattleFighterStats {
        return this.of(id);
    }

    /** The full report, one entry per fighter (first-seen order). */
    report(): BattleReport {
        return Array.from(this.stats.entries()).map(([id, stats]) => ({
            id,
            stats: {
                damageDealt: { ...stats.damageDealt },
                damageReceived: { ...stats.damageReceived },
                healingGiven: stats.healingGiven,
                healingReceived: stats.healingReceived,
                kills: stats.kills,
            },
        }));
    }

    reset(): void {
        this.stats.clear();
    }
}

/** Feeds one tick-engine action record into the tracker. */
export function trackIntervalRecord(tracker: BattleTracker, record: IntervalActionRecord): void {
    if (record.healSelf && record.healSelf > 0) {
        tracker.recordHeal(record.actorId, record.actorId, record.healSelf);
    }
    if (record.damage > 0) {
        tracker.recordHit(record.actorId, record.targetId, record.damage, record.damageByKind);
    }
    if (record.reflect && record.reflect > 0) {
        tracker.recordHit(record.targetId, record.actorId, record.reflect, record.reflectByKind);
    }
}

/** Feeds one hybrid engine event into the tracker. */
export function trackHybridEvent(tracker: BattleTracker, event: HybridAutoEvent): void {
    if (event.effects && event.effects.length > 0) {
        for (const effect of event.effects) {
            if (effect.damage > 0) {
                tracker.recordHit(event.actorId, effect.targetId, effect.damage, effect.byKind);
            }
            if (effect.heal > 0) {
                tracker.recordHeal(event.actorId, effect.targetId, effect.heal);
            }
        }
    } else {
        if (event.damage > 0) {
            tracker.recordHit(event.actorId, event.targetId, event.damage, event.damageByKind);
        }
        if (event.heal && event.heal > 0) {
            tracker.recordHeal(event.actorId, event.targetId, event.heal);
        }
    }
    if (event.reflect && event.reflect > 0) {
        tracker.recordHit(event.targetId, event.actorId, event.reflect, event.reflectByKind);
    }
    for (const kill of event.kills ?? []) {
        tracker.recordKill(kill.killerId);
    }
}
