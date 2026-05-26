import { uniqueID } from '../../helpers/common.helpers';
import { UsableItemDefinition } from '../../types/Items.types';
import { AnyStat } from '../../types/stats.types';
import { Character } from '../Character';


export class UsableItem {
    readonly definition: UsableItemDefinition;

    name?: string;
    description?: string;
    id: string | number;

    constructor(def: UsableItemDefinition) {
        this.definition = def;
        this.id = def.id ?? uniqueID();

        Object.assign(this, def);
    }

    use(target: Character, ...args: any[]) {
        this.definition.onUse?.(this, target, args);
    }
}
