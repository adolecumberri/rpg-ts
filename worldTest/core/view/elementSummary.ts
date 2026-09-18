import type { Character } from '../../../src';
import { attackComponentsOf, defenceLayersOf } from '../damage/character';
import type { ElementId } from '../damage/elements';

export type ElementalAttack = {
    element: ElementId;
    amount: number;
    // True when the whole attack was converted into this element.
    converted: boolean;
};

export type ElementalDefence = {
    element: ElementId;
    reduction: number;
    // 1 = neutral, 0.5 = resistant, 2 = weak.
    multiplier: number;
};

export type CharacterElementsSummary = {
    attack: ElementalAttack[];
    defence: ElementalDefence[];
};

/**
 * Elemental attack enhancements and defence resistances of a character,
 * derived from its equipped items and affinities.
 */
export function characterElementsSummary(character: Character): CharacterElementsSummary {
    const components = attackComponentsOf(character);
    const hasPhysical = components.some((component) => component.element === 'physical');

    const attack: ElementalAttack[] = [];
    for (const component of components) {
        if (component.element === 'physical') continue;
        attack.push({
            element: component.element,
            amount: component.amount,
            converted: !hasPhysical,
        });
    }

    const defence: ElementalDefence[] = [];
    for (const layer of defenceLayersOf(character)) {
        if (layer.element === 'physical') continue;
        defence.push({
            element: layer.element,
            reduction: layer.reduction,
            multiplier: layer.multiplier ?? 1,
        });
    }

    return { attack, defence };
}
