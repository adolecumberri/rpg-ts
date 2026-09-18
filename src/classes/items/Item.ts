import { ModificationTypes } from '../../constants/stats.constants';
import { uniqueID } from '../../helpers/common.helpers';
import type { Character } from '../Character';
import { AnyStat } from '../Stats';
import { EquipmentSlot } from './EquipmentManager';

export interface ItemEffect {
    stat: AnyStat;
    typeOfModification: ModificationTypes;
    value: number;
}

// Generic elemental properties for an item: extra attack of an
// element and/or resistance to it. Element ids are strings so the
// library stays agnostic of specific element lists.
export type ItemElement = {
    element: string;
    attackValue?: number;
    resistanceValue?: number;
    // When true, the wielder's whole attack is converted into this
    // element and attackValue is added on top of the base attack.
    convertsAttack?: boolean;
};

export interface ItemDefinition {
    id?: string | number;

    name: string;
    description?: string;

    category?: ItemCategory;

    buyValue?: number;
    sellValue?: number;

    effects?: ItemEffect[];
    slot?: EquipmentSlot;
    elements?: ItemElement[];

    onEquip?: (self: Item, target: Character) => void;
    onUnEquip?: (self: Item, target: Character) => void;

    onUse?: (
        self: Item,
        target: Character
    ) => boolean;
} // TODO: añadir condicionante.

export type ItemCategory =
    | 'equipment'
    | 'weapon'
    | 'magic_weapon'
    | 'ranged_weapon'
    | 'armor'
    | 'consumable'
    | 'quest'
    | 'key'
    | 'utility';

// Categories that can be equipped by a character.
export function isEquippableCategory(category: ItemCategory): boolean {
    return category === 'equipment' ||
        category === 'weapon' ||
        category === 'magic_weapon' ||
        category === 'ranged_weapon' ||
        category === 'armor';
}

export class Item {
    id: string;
    readonly definition: ItemDefinition;
    name: string;
    description?: string;
    category: ItemCategory;
    ownerId?: string;
    equiped: boolean;

    buyValue: number;
    sellValue: number;

    constructor(definition: ItemDefinition) {
        this.definition = definition;
        this.id = String(definition.id ?? uniqueID());
        this.name = definition.name;
        this.description = definition.description;
        this.category = definition.category ?? 'equipment';
        this.equiped = false;
        this.buyValue = definition.buyValue ?? 0;
        this.sellValue = definition.sellValue ?? 0;
    }

    getModifierSourceId(): string {
        return `item:${this.id}`;
    }

    equip(target: Character): void {
        const source = target.stats.getModifierSource(this.getModifierSourceId());

        for (const effect of this.definition.effects ?? []) {
            source.setModifier(effect.stat, effect.typeOfModification, effect.value);
        }

        this.equiped = true;
        this.ownerId = target.id;

        this.definition.onEquip?.(this, target);
    }

    unEquip(target: Character): void {
        target.stats.removeModifierSource(this.getModifierSourceId());
        this.definition.onUnEquip?.(this, target);

        this.equiped = false;
        this.ownerId = undefined;
    }
}
