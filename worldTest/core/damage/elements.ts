export type ElementId = 'physical' | 'fire' | 'ice' | 'lightning' | 'poison';

export type ElementDefinition = {
    id: ElementId;
    name: string;
    icon: string;
};

export class ElementRegistry {
    private elements: Map<ElementId, ElementDefinition> = new Map();

    register(element: ElementDefinition): void {
        if (this.elements.has(element.id)) {
            throw new Error(`Element '${element.id}' is already registered.`);
        }
        this.elements.set(element.id, element);
    }

    has(id: string): boolean {
        return this.elements.has(id as ElementId);
    }

    get(id: string): ElementDefinition | undefined {
        return this.elements.get(id as ElementId);
    }

    getAll(): ElementDefinition[] {
        return Array.from(this.elements.values());
    }
}

export const DEFAULT_ELEMENTS = new ElementRegistry();
DEFAULT_ELEMENTS.register({ id: 'physical', name: 'Physical', icon: '⚔️' });
DEFAULT_ELEMENTS.register({ id: 'fire', name: 'Fire', icon: '🔥' });
DEFAULT_ELEMENTS.register({ id: 'ice', name: 'Ice', icon: '❄️' });
DEFAULT_ELEMENTS.register({ id: 'lightning', name: 'Lightning', icon: '⚡' });
DEFAULT_ELEMENTS.register({ id: 'poison', name: 'Poison', icon: '☠️' });
