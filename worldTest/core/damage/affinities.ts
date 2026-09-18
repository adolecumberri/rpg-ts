import type { ElementId } from './elements';

// Elemental affinity multipliers per character id:
// 2 = weakness (takes double damage), 0.5 = resistance (takes half).
const CHARACTER_AFFINITIES = new Map<string, Partial<Record<ElementId, number>>>();

export function setAffinity(characterId: string, element: ElementId, multiplier: number): void {
    const affinities = CHARACTER_AFFINITIES.get(characterId) ?? {};
    affinities[element] = multiplier;
    CHARACTER_AFFINITIES.set(characterId, affinities);
}

export function affinitiesOf(characterId: string): Partial<Record<ElementId, number>> {
    return CHARACTER_AFFINITIES.get(characterId) ?? {};
}

export { CHARACTER_AFFINITIES };
