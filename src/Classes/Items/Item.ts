import { uniqueID } from '../../helpers/common.helpers';
import { ItemDefinition } from '../../types/Items.types';
import { AnyStat } from '../../types/stats.types';
import { Character } from '../Character';


export class Item {
    readonly definition: ItemDefinition;

    name?: string;
    description?: string;
    id: string | number;

    constructor(def: ItemDefinition) {
        this.definition = def;
        this.id = def.id ?? uniqueID();

        Object.assign(this, def);
    }

    equip(targetCharacter: Character) {
        this.definition.onEquip?.(this, targetCharacter);

        // Aplicar efectos
        this.definition.effects?.forEach((effect) => {
            targetCharacter.stats.addModifier(effect.stat, effect.typeOfModification, effect.value);
        });
    }

    unEquip(target: Character) {
        this.definition.onUnEquip?.(this, target);

        // Revertir efectos
        this.definition.effects?.forEach((effect) => {
            target.stats.revert(effect.stat, effect.typeOfModification, effect.value);
        });
    }
}
