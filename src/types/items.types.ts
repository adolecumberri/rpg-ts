import { Character } from '../Classes/Character';
import { Item } from '../Classes/Items/Item';
import { UsableItem } from '../Classes/Items/UsableItem';
import { AnyStat } from './stats.types';

export interface ItemEffect {
    stat: AnyStat;
    type: 'FIXED' | 'PERCENTAGE';
    value: number;
}

export interface GeneralItemDefinition<T extends object = any> {
    name: string;
    description?: string;
};

export interface UsableItemDefinition extends GeneralItemDefinition {
    effects?: ItemEffect[];
    onUse?: (self: UsableItem, target: Character) => void;
};

export interface ItemDefinition<T extends object = any> extends GeneralItemDefinition<T> {
    effects?: ItemEffect[];
    onEquip?: (self: Item, target: Character<T>) => void;
    onUnEquip?: (self: Item, target: Character<T>) => void;
};
