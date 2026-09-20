import type { Character } from '../../../src';
import { DEFAULT_ELEMENTS } from './elements';
import type { DamageComponent, DamageResult, DefenceLayer, ResolveOptions } from './composer';
import type { ElementId } from './elements';
import { CHARACTER_AFFINITIES } from './affinities';
import { kindOfElement } from '../config/damage';
import { resolveGeneralAttack } from './general';

/**
 * Attack components of a character: the base physical attack plus the
 * damage of every equipped item, each with the kind of its element
 * (physical, magical or true). Components are derived from the
 * currently equipped items on every call, so equipping and unequipping
 * items updates the attack automatically.
 */
export function attackComponentsOf(character: Character): DamageComponent[] {
    const baseAttack = character.getStat('attack');
    const equipped = character.equipment.getEquippedItems();

    const components: DamageComponent[] = [
        { kind: 'physical', element: 'physical', amount: baseAttack, label: 'Attack' },
    ];

    for (const item of equipped) {
        for (const element of item.definition.elements ?? []) {
            if (!element.attackValue) continue;
            components.push({
                kind: kindOfElement(element.element),
                element: element.element as ElementId,
                amount: element.attackValue,
                label: item.name,
            });
        }
    }

    return components;
}

/**
 * Defence layers of a character: the elemental resistances of every
 * equipped item (merged by element) plus the character's elemental
 * affinities (multipliers). The flat defence/magicDefence reduction is
 * NOT a layer: the general resolver applies it by damage kind.
 */
export function defenceLayersOf(character: Character): DefenceLayer[] {
    const layers: DefenceLayer[] = [];

    const reductions = new Map<ElementId, number>();
    for (const item of character.equipment.getEquippedItems()) {
        for (const element of item.definition.elements ?? []) {
            if (!element.resistanceValue) continue;
            const id = element.element as ElementId;
            reductions.set(id, (reductions.get(id) ?? 0) + element.resistanceValue);
        }
    }

    for (const [element, reduction] of reductions) {
        layers.push({
            element,
            reduction,
            label: DEFAULT_ELEMENTS.get(element)?.name ?? element,
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
 * Full general resolution of a basic attack and its application. By
 * default no crit is ever rolled (the injected random returns 1) so
 * plain attacks stay deterministic; pass a `random` source to enable
 * crits.
 */
export function resolveBasicAttack(
    attacker: Character,
    defender: Character,
    options: ResolveOptions & { random?: () => number } = {},
): DamageResult {
    const outcome = resolveGeneralAttack(attacker, defender, options.random ?? (() => 1), options);
    const result: DamageResult = {
        total: outcome.damage,
        breakdown: outcome.breakdown ?? [],
    };
    applyDamageResult(defender, result);
    return result;
}
