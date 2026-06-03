import { uniqueID } from "../helpers/common.helpers";
import { CombatBehavior } from "../classes/CombatBehavior";
import { Stats } from "../classes/Stats";
import { Inventory } from "./Inventory";
import { Experience } from "./Experience";
import { EventEmitter } from "./EventEmitter";


type CharacterConstructor = {
    id?: string;
    name?: string;
    combat?: CombatBehavior;
    stats?: Stats;
    inventory?: Inventory;
    experience?: Experience;
    eventEmitter?: EventEmitter<any>;
};

export class Character {
    id: string;
    name: string;
    stats: Stats;
    combat: CombatBehavior;
    inventory: Inventory;
    experience: Experience;
    eventEmitter: EventEmitter<any>;


    constructor(params: Partial<CharacterConstructor> = {}) {

        this.id = params.id || uniqueID();
        this.name = params.name || this.id;
        this.stats = params.stats || new Stats();
        this.combat = params.combat || new CombatBehavior();
        this.inventory = params.inventory || new Inventory(this);
        this.experience = params.experience || new Experience();
        this.eventEmitter = params.eventEmitter || new EventEmitter();
        // ensure externally provided inventories are bound to this character
        this.inventory.setOwner(this);
    }

}

