import { UsableItemDefinition } from '../../types/Items.types';
import { AnyStat } from '../../types/stats.types';
import { Character } from '../Character';


export class UsableItem<T extends object = any> {
    readonly definition: UsableItemDefinition;

    constructor(def: UsableItemDefinition) {
        this.definition = def;
    }

    use(target: Character<T>) {
        this.definition.onUse?.(this, target);
    }
}
