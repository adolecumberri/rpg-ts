import { ItemDefinition } from '../../types/Items.types';
import { AnyStat } from '../../types/stats.types';
import { Character } from '../Character';


export class Item {
    readonly definition: ItemDefinition;

    constructor(def: ItemDefinition) {
        this.definition = def;
    }

    equip(target: Character) {
        this.definition.onEquip?.(this, target);

        // Aplicar efectos
        this.definition.effects?.forEach((effect) => {
            target.stats.modify(effect.stat, effect.type, effect.value);
        });
    }

    unEquip(target: Character) {
        this.definition.onUnEquip?.(this, target);

        // Revertir efectos
        this.definition.effects?.forEach((effect) => {
            target.stats.revert(effect.stat, effect.type, effect.value);
        });
    }
}
