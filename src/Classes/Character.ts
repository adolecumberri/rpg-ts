import { uniqueID } from "../helpers/common.helpers";
import { CombatBehavior } from "../classes/CombatBehavior";
import { Stats } from "../classes/Stats";
import { Inventory } from "./Inventory";



type CharacterConstructor = {
    id?: string;
    name?: string;
    combat?: CombatBehavior;
    stats?: Stats;
    inventory?: Inventory;
};

export class Character {
    id: string;
    name: string;
    stats: Stats;
    combat: CombatBehavior;
    inventory: Inventory;


    constructor(params: Partial<CharacterConstructor> = {}) {

        this.id = params.id || uniqueID();
        this.name = params.name || this.id;
        this.stats = params.stats || new Stats();
        this.combat = params.combat || new CombatBehavior();
        this.inventory = params.inventory || new Inventory(this);

        // ensure externally provided inventories are bound to this character
        this.inventory.setOwner(this);
    }

}

