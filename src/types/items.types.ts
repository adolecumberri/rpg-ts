import { Character } from '../Classes/Character';
import { Item } from '../Classes/Items/Item';
import { UsableItem } from '../Classes/Items/UsableItem';
import { MODIFICATION_TYPES } from '../constants/common.constants';
import { ModificationTypes } from './common.types';
import { AnyStat } from './stats.types';

export interface ItemEffect {
    stat: AnyStat;
    typeOfModification: ModificationTypes;
    value: number;
}

export interface GeneralItemDefinition {
    name: string;
    description?: string;
    id: string | number;
};

export interface UsableItemDefinition extends GeneralItemDefinition {
    effects?: ItemEffect[];
    onUse?: (self: UsableItem, target: Character, args: any[]) => void;
};

export interface ItemDefinition extends GeneralItemDefinition {

    effects?: ItemEffect[];
    onEquip?: (self: Item, target: Character) => void;
    onUnEquip?: (self: Item, target: Character) => void;
};
