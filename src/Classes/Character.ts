import { uniqueID } from "../helpers/common.helpers";
import { CombatBehavior } from "../classes/CombatBehavior";
import { Statistics, Stats } from "../classes/Stats";
import { Inventory } from "./Inventory";
import { Experience } from "./Experience";
import { EventEmitter } from "./EventEmitter";
import { StatusManager } from "./StatusManager";
import { EquipmentManager } from "./items/EquipmentManager";

type CharacterConstructor = {
    id?: string;
    name?: string;
    combat?: CombatBehavior;
    stats?: Stats;
    inventory?: Inventory;
    experience?: Experience;
    eventEmitter?: EventEmitter<any>;
    statusManager?: StatusManager;
    equipment?: EquipmentManager;
};

export class Character {
    id: string;
    name: string;
    stats: Stats;
    combat: CombatBehavior;
    equipment: EquipmentManager;
    experience: Experience;
    eventEmitter: EventEmitter<any>;
    statusManager: StatusManager;


    constructor(params: Partial<CharacterConstructor> = {}) {

        this.id = params.id || uniqueID();
        this.name = params.name || this.id;
        this.stats = params.stats || new Stats();
        this.combat = params.combat || new CombatBehavior();
        this.experience = params.experience || new Experience();
        this.eventEmitter = params.eventEmitter || new EventEmitter();
        this.equipment = params.equipment ?? new EquipmentManager();
        // ensure externally provided inventories are bound to this character

        this.statusManager = params.statusManager || new StatusManager(this);
    }

    getStat(stat: keyof Statistics): number {
        let rawValue = this.stats[stat as keyof Statistics] as number;

        rawValue = rawValue +
            this.stats.calculateStatVariation(stat) +
            this.equipment.calculateStatVariation(rawValue, stat);

        return Math.round(rawValue * 100) / 100;
    }

}

