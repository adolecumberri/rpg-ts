import type { ElementId } from './elements';
import type { DamageKind } from '../config/damage';

export type DamageComponent = {
    element: ElementId;
    amount: number;
    label: string;
    // Physical by default; 'true' components skip every mitigation.
    kind?: DamageKind;
    // Set by the crit roll so breakdowns and logs can show it.
    crit?: boolean;
};

export type DefenceLayer = {
    element: ElementId;
    // Flat damage reduction for the element.
    reduction: number;
    label: string;
    // Damage multiplier for the element (2 = weak, 0.5 = resistant).
    multiplier?: number;
};

export type ComponentLine = {
    element: ElementId;
    label: string;
    damage: number;
    multiplier: number;
    reducedBy: number;
    final: number;
    crit?: boolean;
};

export type DamageResult = {
    // Single final value (one digit when values are integers).
    total: number;
    // Per-component breakdown; only filled when the breakdown flag is on.
    breakdown: ComponentLine[];
};

export type ResolveOptions = {
    breakdown?: boolean;
};

// Multiplicative mitigation a kind suffers before elemental layers:
// physical uses 50/(50+defence), magical uses 50/(50+magicDefence),
// true uses 1 (no mitigation). Elemental affinities multiply on top.
export type KindMultiplier = (kind: DamageKind) => number;

/**
 * Compounds multiple damage components and resolves each of them:
 * multiplier first (affinity × defence formula), then flat reduction
 * from matching elemental resistance layers. True-damage components
 * bypass everything and deal their amount as final damage. The result
 * is always a single final number; the breakdown is returned when
 * requested.
 */
export class DamageComposer {
    /**
     * Elemental-layer-only resolution (the historic behaviour, kept for
     * compatibility): no kind mitigation is applied.
     */
    static resolve(
        components: DamageComponent[],
        layers: DefenceLayer[],
        options: ResolveOptions = {},
    ): DamageResult {
        return DamageComposer.resolveKinds(components, layers, () => 1, options);
    }

    static resolveKinds(
        components: DamageComponent[],
        layers: DefenceLayer[],
        kindMultiplier: KindMultiplier,
        options: ResolveOptions = {},
    ): DamageResult {
        const showBreakdown = options.breakdown ?? false;
        const breakdown: ComponentLine[] = [];
        let total = 0;

        for (const component of components) {
            const kind = component.kind ?? 'physical';
            const matching = layers.filter((layer) => layer.element === component.element);
            const layerReduction = matching.reduce((sum, layer) => sum + layer.reduction, 0);
            const affinity = matching.find((layer) => layer.multiplier !== undefined)?.multiplier ?? 1;

            let final: number;
            let reducedBy: number;
            let appliedMultiplier: number;

            if (kind === 'true') {
                // True damage deals its amount as final damage: no
                // affinities, no defence formula, no resistances.
                final = component.amount;
                reducedBy = 0;
                appliedMultiplier = 1;
            } else {
                // Affinity first, then the multiplicative defence formula
                // (50/(50+defence) style), then flat elemental resistance.
                appliedMultiplier = affinity * kindMultiplier(kind);
                const afterMultiplier = component.amount * appliedMultiplier;
                reducedBy = Math.min(afterMultiplier, layerReduction);
                final = Math.max(0, afterMultiplier - reducedBy);
            }

            total += final;

            if (showBreakdown) {
                breakdown.push({
                    element: component.element,
                    label: component.label,
                    damage: component.amount,
                    multiplier: appliedMultiplier,
                    reducedBy,
                    final,
                    crit: component.crit,
                });
            }
        }

        return { total: Math.round(total * 100) / 100, breakdown };
    }
}
