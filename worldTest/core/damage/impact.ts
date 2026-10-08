import type { Character } from '../../../src';
import { DAMAGE_TYPES, MAGICAL_ELEMENTS, PHYSICAL_ELEMENTS } from '../config/damage';
import type { DamageComponent } from './composer';
import { equippedItemsOf } from '../equipment/loadout';
import { skillIdsOf, specOf } from '../skills';

// ---------------------------------------------------------------------------
// The impact-hit pipeline. Every attack carries a number of impact hits:
// statuses react to each one (Sheen Ready adds damage and is consumed,
// Phantom Strike raises the impact count), equipped items add their
// on-impact bonus once per impact (Guinsoo's +6/+6), and counter-driven
// procs fire on the Nth hit or impact (Guinsoo's phantom, Silver
// Bullets). Procs may raise the impact count, which re-enters the loop.
// ---------------------------------------------------------------------------

export type ImpactHitContext = {
    attacker: Character;
    defender: Character;
    // Impact hits still to apply (statuses and procs may raise it).
    impactHits: number;
    // The hit's components being assembled (hooks append here).
    components: DamageComponent[];
    random: () => number;
};

export type ImpactProc = {
    id: string;
    // 'hit': counted once per attack action of the bearer; 'impact':
    // counted once per impact hit applied.
    moment: 'hit' | 'impact';
    // The trigger fires when the counter is a multiple of this.
    every: number;
    // Count per (attacker, defender) pair instead of per attacker
    // (Silver Bullets: the third hit against the SAME enemy).
    perTarget?: boolean;
    onTrigger: (ctx: ImpactHitContext) => void;
};

// Per-attacker counters (WeakMap, so characters never leak between tests).
const counters = new WeakMap<Character, Map<string, number>>();

function bump(character: Character, key: string): number {
    let map = counters.get(character);
    if (!map) {
        map = new Map();
        counters.set(character, map);
    }
    const next = (map.get(key) ?? 0) + 1;
    map.set(key, next);
    return next;
}

/** The procs of the attacker's equipment and passive skills. */
function impactProcsOf(attacker: Character): ImpactProc[] {
    const procs: ImpactProc[] = [];
    for (const item of equippedItemsOf(attacker)) {
        for (const proc of item.definition.impactProcs ?? []) procs.push(proc);
    }
    for (const skillId of skillIdsOf(attacker)) {
        for (const proc of specOf(skillId)?.impactProcs ?? []) procs.push(proc);
    }
    return procs;
}

/**
 * Resolves the impact phase of one hit: consumes every impact hit,
 * running the bearer's impact statuses, the per-impact item bonuses
 * and the counter procs. Returns the number of impacts applied.
 */
export function resolveImpactHits(ctx: ImpactHitContext): number {
    const items = equippedItemsOf(ctx.attacker);
    const procs = impactProcsOf(ctx.attacker);
    let applied = 0;
    let hitCounted = false;

    while (true) {
        while (ctx.impactHits > 0) {
            ctx.impactHits--;
            applied++;

            // 1. The bearer's impact statuses: they may consume
            // themselves, add components (Sheen) or raise the remaining
            // impact count (Phantom Strike).
            ctx.attacker.statusManager.trigger('impact_hit', ctx);

            // 2. Per-impact item bonuses (Guinsoo's +6/+6).
            for (const item of items) {
                const bonus = item.definition.impactBonus;
                if (!bonus) continue;
                if (bonus.physical) {
                    ctx.components.push({
                        kind: DAMAGE_TYPES.PHYSICAL,
                        element: PHYSICAL_ELEMENTS.NORMAL,
                        amount: bonus.physical,
                        label: 'Impact',
                    });
                }
                if (bonus.magical) {
                    ctx.components.push({
                        kind: DAMAGE_TYPES.MAGICAL,
                        element: MAGICAL_ELEMENTS.NORMAL,
                        amount: bonus.magical,
                        label: 'Impact',
                    });
                }
            }

            // 3. Per-impact counters.
            for (const proc of procs) {
                if (proc.moment !== 'impact') continue;
                const key = `impact:${proc.id}:${proc.perTarget ? ctx.defender.id : ''}`;
                if (bump(ctx.attacker, key) % proc.every === 0) proc.onTrigger(ctx);
            }
        }

        if (hitCounted) break;
        hitCounted = true;

        // 4. Per-attack counters (Guinsoo's phantom hit and charge,
        // Silver Bullets). A trigger may raise the impact count, which
        // the loop above then consumes.
        for (const proc of procs) {
            if (proc.moment !== 'hit') continue;
            const key = `hit:${proc.id}:${proc.perTarget ? ctx.defender.id : ''}`;
            if (bump(ctx.attacker, key) % proc.every === 0) proc.onTrigger(ctx);
        }
    }

    return applied;
}
