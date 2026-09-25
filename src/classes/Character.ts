import { uniqueID } from '../helpers/common.helpers';
import { CombatBehavior } from '../classes/CombatBehavior';
import { Statistics, Stats } from '../classes/Stats';
import { Inventory } from './Inventory';
import { Experience } from './Experience';
import { EventEmitter } from './EventEmitter';
import { StatusManager } from './StatusManager';
import { EquipmentManager } from './items/EquipmentManager';
import { Skill } from './Skills';
import { CombatTrigger } from './Combat/Combat.interfaces';
import { TeamPosition } from '../constants/team.constants';

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
    skills?: Skill[];
    // Formation row inside its team: front (taunt ×3), center (×2) or
    // back (×1). Defaults to front, so untouched teams keep behaving
    // exactly like before (everyone in the same row cancels out).
    position?: TeamPosition;
};

export class Character {
    id: string;
    name: string;
    stats: Stats;
    combat: CombatBehavior;
    equipment: EquipmentManager;
    inventory: Inventory;
    experience: Experience;
    eventEmitter: EventEmitter<any>;
    statusManager: StatusManager;
    combatTriggers: CombatTrigger[] = [];
    skills: Skill[] = [];
    // Formation row inside the team: multiplies the taunt weight used
    // when enemies pick random targets.
    position: TeamPosition;

    constructor(params: Partial<CharacterConstructor> = {}) {
        this.id = params.id || uniqueID();
        this.name = params.name || this.id;
        this.stats = params.stats || new Stats();
        this.combat = params.combat || new CombatBehavior();
        this.experience = params.experience || new Experience();
        this.eventEmitter = params.eventEmitter || new EventEmitter();
        this.equipment = params.equipment ?? new EquipmentManager();
        this.inventory = params.inventory ?? new Inventory(this);
        // ensure externally provided inventories are bound to this character
        this.inventory.setOwner(this);

        this.statusManager = params.statusManager || new StatusManager(this);
        this.skills = params.skills ?? [];
        this.position = params.position ?? 'front';
    }

    getStat(stat: keyof Statistics): number {
        return this.stats.calculateStatValue(stat);
    }
}

