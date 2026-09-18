import type { Character } from '../../../src';
import { DEFAULT_ELEMENTS } from './elements';
import { DamageComposer } from './composer';
import type { DamageComponent, DamageResult, DefenceLayer, ResolveOptions } from './composer';
import type { ElementId } from './elements';
import { CHARACTER_AFFINITIES } from './affinities';

/**
 * Attack components of a character: base physical attack plus the
 * elemental attack of every equipped item. An equipped item with
 * `convertsAttack` converts the whole attack into its element and
 * adds its attackValue on top.
 */
export function attackComponentsOf(character: Character): DamageComponent[] {
    const baseAttack = character.getStat('attack');
    const equipped = character.equipment.getEquippedItems();

    const converter = (() => {
        for (const item of equipped) {
            for (const element of item.definition.elements ?? []) {
                if (element.convertsAttack) {
                    return { element, item };
                }
            }
        }
        return undefined;
    })();

    if (converter) {
        const components: DamageComponent[] = [{
            element: converter.element.element as ElementId,
            amount: baseAttack + (converter.element.attackValue ?? 0),
            label: converter.item.name,
        }];

        // Other elemental bonuses (non-converting) still apply.
        for (const item of equipped) {
            for (const element of item.definition.elements ?? []) {
                if (element.convertsAttack) continue;
                if (element.attackValue) {
                    components.push({ element: element.element as ElementId, amount: element.attackValue, label: item.name });
                }
            }
        }

        return components;
    }

    const components: DamageComponent[] = [
        { element: 'physical', amount: baseAttack, label: 'Attack' },
    ];

    for (const item of equipped) {
        for (const element of item.definition.elements ?? []) {
            if (element.attackValue) {
                components.push({ element: element.element as ElementId, amount: element.attackValue, label: item.name });
            }
        }
    }

    return components;
}

/**
 * Defence layers of a character: base physical defence, the elemental
 * resistances of every equipped item (merged by element), plus the
 * character's elemental affinities (multipliers).
 */
export function defenceLayersOf(character: Character): DefenceLayer[] {
    const layers: DefenceLayer[] = [];

    const reductions = new Map<ElementId, number>();
    reductions.set('physical', character.getStat('defence'));

    for (const item of character.equipment.getEquippedItems()) {
        for (const element of item.definition.elements ?? []) {
            if (element.resistanceValue) {
                const id = element.element as ElementId;
                reductions.set(id, (reductions.get(id) ?? 0) + element.resistanceValue);
            }
        }
    }

    for (const [element, reduction] of reductions) {
        layers.push({
            element,
            reduction,
            label: element === 'physical' ? 'Defence' : (DEFAULT_ELEMENTS.get(element)?.name ?? element),
        });
    }

    // Elemental affinities act as damage multipliers (2 = weak, 0.5 = resistant).
    const affinities = CHARACTER_AFFINITIES.get(character.id) ?? {};
    for (const [element, multiplier] of Object.entries(affinities)) {
        if (multiplier === undefined) continue;
        const id = element as ElementId;
        layers.push({
            element: id,
            reduction: 0,
            multiplier,
            label: `×${multiplier} ${DEFAULT_ELEMENTS.get(id)?.name ?? id}`,
        });
    }

    return layers;
}

export function applyDamageResult(character: Character, result: DamageResult): void {
    character.stats.hp = Math.max(0, character.stats.hp - result.total);
    character.stats.isAlive = character.stats.hp > 0 ? 1 : 0;
}

/**
 * Full compound resolution of a basic attack and its application.
 */
export function resolveBasicAttack(
    attacker: Character,
    defender: Character,
    options?: ResolveOptions,
): DamageResult {
    const result = DamageComposer.resolve(attackComponentsOf(attacker), defenceLayersOf(defender), options);
    applyDamageResult(defender, result);
    return result;
}
