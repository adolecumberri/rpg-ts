import type { ElementId } from './elements';

export type DamageComponent = {
    element: ElementId;
    amount: number;
    label: string;
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

/**
 * Compounds multiple damage components and resolves each of them
 * against the defender's matching layers: multiplier first, then flat
 * reduction. The result is always a single final number; the breakdown
 * is returned when requested.
 */
export class DamageComposer {
    static resolve(
        components: DamageComponent[],
        layers: DefenceLayer[],
        options: ResolveOptions = {},
    ): DamageResult {
        const showBreakdown = options.breakdown ?? false;
        const breakdown: ComponentLine[] = [];
        let total = 0;

        for (const component of components) {
            const matching = layers.filter((layer) => layer.element === component.element);
            const reduction = matching.reduce((sum, layer) => sum + layer.reduction, 0);
            const multiplier = matching.find((layer) => layer.multiplier !== undefined)?.multiplier ?? 1;

            const afterMultiplier = component.amount * multiplier;
            const reducedBy = Math.min(afterMultiplier, reduction);
            const final = Math.max(0, afterMultiplier - reducedBy);
            total += final;

            if (showBreakdown) {
                breakdown.push({
                    element: component.element,
                    label: component.label,
                    damage: component.amount,
                    multiplier,
                    reducedBy,
                    final,
                });
            }
        }

        return { total: Math.round(total * 100) / 100, breakdown };
    }
}
