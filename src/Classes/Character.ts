import { uniqueID } from "../helpers/common.helpers";
import { CombatBehavior } from "../classes/CombatBehavior";
import { Stats } from "../classes/Stats";



type CharacterConstructor = {
    id?: string;
    combat?: CombatBehavior;
    stats?: Stats;
    // inventory?: Inventory;
};

export class Character {
    id: string;
    stats: Stats;
    combat: CombatBehavior;


    constructor(params: Partial<CharacterConstructor>) {

        this.id = params.id || uniqueID();
        this.stats = params.stats || new Stats();
        this.combat = params.combat || new CombatBehavior();
    }

}

