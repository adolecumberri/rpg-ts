import { Character, Combat, Item, Team } from "../../src";
import { uniqueID } from "../../src/helpers/common.helpers";
import { CombatController } from "../Combat/CombatController";
import { Menu, MenuChoice } from "../menu/Menu";
import { NPC } from "../NPC/npc";
import { Place, PLACES, PlaceTrigger } from "../Places/Place";
import { Quest } from "../quests/Quest";

export class Game {
    private running = true;
    menu: Menu;
    team: Team;

    private places: Map<string, Place> = new Map();
    private currentPlaceId: string = "default";
    // private previousPlaceId: string = "default";
    private quests: Quest[] = [];
    private lockedConnections = new Set<string>(); //`${fromId}->${toId}`
    private executedTriggers = new Set<string>();

    private uiQueue: Array<() => Promise<void>> = [];

    private combat = new Combat({
        randomTarget: false,
    });

    constructor(menu: Menu) {
        this.menu = menu;
        this.team = new Team();

        this.currentPlaceId = "central_town";

        this.loadPlaces(PLACES);
    }

    async start() {
        for (const quest of this.quests) {
            await quest.start(this);
        }

        while (this.running) {
            this.running = await this.mainLoop();
        }

        this.menu.cleanupInput();
        process.stdout.write("\nGoodbye.\n");
    }

    private async mainLoop() {
        // 1. run queued UI first
        await this.flushUI();



        const place = this.getCurrentPlace();

        const travelOptions = (place.connections ?? [])
            .filter(conn => !this.isConnectionLocked(place.id, conn.to))
            .map(conn => ({
                label: conn.label,
                execute: async () => {
                    await this.travelTo(conn.to);
                    // await this.menu.waitForAnyKey("Press any key...");
                    return true;
                },
            }));

        const placeActions = (place.actions ?? []).map(action => ({
            label: action.label,
            execute: async () => action.onSelect(this),
        }));

        const npcInteractions = (place.npcs ?? []).flatMap((npc) =>
            npc.interactions.map((interaction) => ({
                label: `[${npc.character.name}] ${interaction.label}`,
                execute: async () => { await interaction.onSelect(this, npc); return true; },
            }))
        );

        const menuOptions = [
            ...placeActions,
            ...npcInteractions,
            ...travelOptions,
            {
                label: "Display Team",
                execute: async () => {
                    await this.showTeamMenu();
                    return true;
                }
            },
            {
                label: "Inventory",
                execute: async () => {
                    console.clear();
                    await this.showInventoryMenu();
                    await this.menu.waitForAnyKey("Press any key...");
                    return true;
                },
            },
            {
                label: "Display NPCs",
                execute: async () => {
                    console.clear();
                    const place = this.getCurrentPlace();
                    if (place.npcs && place.npcs.length > 0) {
                        console.log("You see the following NPCs:");
                        place.npcs.forEach(npc => {
                            console.log(`- ${npc.character.name} | ATK ${npc.character.getStat("attack")} | DEF ${npc.character.getStat("defence")} | HP ${npc.character.getStat("hp")}/${npc.character.getStat("totalHp")}`);
                        });
                    } else {
                        console.log("There are no NPCs here.");
                    }
                    await this.menu.waitForAnyKey("Press any key...");
                    return true;
                },
            },
            {
                label: "Exit Game",
                execute: async () => {
                    this.running = false;
                    return false;
                },
            },
        ];

        const index = await this.menu.selectMenuOption(
            `${place.name.toUpperCase()}`,
            menuOptions
        );

        return await menuOptions[index].execute();

    }

    private loadPlaces(places: Record<string, Place>) {
        for (const place of Object.values(places)) {
            this.places.set(place.id, place);
        }
    }

    addPlace(place: Place) {
        this.places.set(place.id, place);
    }

    private getCurrentPlace(): Place {
        return this.places.get(this.currentPlaceId)!;
    }

    placeCount(): string {
        return uniqueID();
    }

    private async travelTo(placeId: string): Promise<void> {
        if (!this.places.has(placeId)) {
            throw new Error(`Place not found: ${placeId}`);
        }

        const from = this.currentPlaceId;
        const to = placeId;

        const fromPlace = this.places.get(from)!;
        const toPlace = this.places.get(to)!;

        // EXIT triggers
        await this.runTriggers(fromPlace.onExit, to);

        // this.previousPlaceId = from;
        this.currentPlaceId = to;

        // ENTER triggers
        await this.runTriggers(toPlace.onEnter, from);
    }

    addConnectionToPlace(placeFromId: string, placeToId: string, label: string) {
        const place = this.places.get(placeFromId);
        if (!place) {
            throw new Error(`Place not found: ${placeFromId}`);
        }
        place.connections.push({ label, to: placeToId });
    }
    removeActionFromPlace(placeId: string, actionId: string) {
        const place = this.places.get(placeId);
        if (!place) {
            throw new Error(`Place not found: ${placeId}`);
        }
        place.actions = place.actions?.filter(action => action.id !== actionId);
    }


    // LOCK/UNLOCK CONNECTIONS
    lockConnection(from: string, to: string) {
        this.lockedConnections.add(`${from}->${to}`);
    }

    unlockConnection(from: string, to: string) {
        this.lockedConnections.delete(`${from}->${to}`);
    }

    isConnectionLocked(from: string, to: string): boolean {
        const key = `${from}->${to}`;

        const place = this.places.get(from);
        const conn = place?.connections?.find(c => c.to === to);

        if (conn?.locked) return true;

        return this.lockedConnections.has(key);
    }


    // TRIGGERS
    private async runTriggers(
        triggers: PlaceTrigger[] | undefined,
        from?: string
    ) {
        if (!triggers) return;

        for (const trigger of triggers) {

            // 1. once logic
            if (trigger.once && this.executedTriggers.has(trigger.id)) {
                continue;
            }

            // 2. condition check
            if (trigger.condition) {
                const ok = await trigger.condition(this, from);
                if (!ok) continue;
            }

            // 3. execute effects
            for (const effect of trigger.effects) {
                await effect(this, from);
            }

            // 4. mark as executed
            if (trigger.once) {
                this.executedTriggers.add(trigger.id);
            }
        }
    }


    // MENU QUEUING
    enqueueUI(fn: () => Promise<void>) {
        this.uiQueue.push(fn);
    }

    private async flushUI() {
        while (this.uiQueue.length > 0) {
            const fn = this.uiQueue.shift()!;
            await fn();
        }
    }


    // QUESTS

    addQuest(quest: Quest) {
        this.quests.push(quest);
    }

    //NPCs
    addNPC(placeId: string, npc: NPC) {
        const place = this.places.get(placeId);
        if (!place) throw new Error(`Place not found: ${placeId}`);

        if (!place.npcs) {
            place.npcs = [];
        }

        place.npcs.push(npc);
    }

    removeNPC(placeId: string, npcId: string) {
        const place = this.places.get(placeId);
        if (!place?.npcs) return;
        place.npcs = place.npcs.filter(n => n.id !== npcId);
    }

    getNPC(placeId: string, npcId: string): NPC | undefined {
        const place = this.places.get(placeId);
        return place?.npcs?.find(n => n.id === npcId);
    }

    moveNPC(npcId: string, fromPlace: string, toPlace: string) {
        const from = this.places.get(fromPlace);
        const to = this.places.get(toPlace);

        if (!from || !to) throw new Error("Place not found");

        const npcIndex = from.npcs?.findIndex(n => n.id === npcId);

        if (npcIndex === undefined || npcIndex === -1) return;

        const [npc] = from.npcs!.splice(npcIndex, 1);

        if (!to.npcs) to.npcs = [];
        to.npcs.push(npc);
    }

    recruitNPC(npc: NPC, fromPlaceId: string) {
        const place = this.places.get(fromPlaceId);
        if (!place?.npcs) return false;

        this.removeNPC(fromPlaceId, npc.id);

        this.team.addCharacter(npc.character);
        return true;
    }


    // COMBAT
    async fightNPC(placeId: string, npcId: string) {

        const npc = this.getNPC(placeId, npcId);

        if (!npc) {
            return;
        }

        const playerTeam = this.team;

        /* This is the automatic combat logic */
        // const combatResult = this.combat.auto(
        //     playerCharacters,
        //     npc.character,
        // );

        const controller = new CombatController(this.menu, this.combat);

        const combatResult = await controller.startBattle(
            {
                side: playerTeam,
                controlledByPlayer: true,
            },
            {
                side: npc.character,
                controlledByPlayer: false,
            }
        );

        await this.showCombatResult(combatResult);

        if (combatResult.winner === "left") {
            if (npc.onDefeat) {
                await npc.onDefeat?.(this, npc, placeId);
            }

            this.shareExperience(playerTeam.getAlive(), npc.experienceReward ?? 0);
        }

        if (combatResult.winner === "right") {
            await this.handlePlayerDefeat();
        }
    }



    private async showCombatResult(result: { winner: "left" | "right" | "draw" }) {
        console.clear();
        console.log("Combat Result:");
        console.log(`Winner: ${result.winner}`);
        // console.log(`Rounds: ${result.rounds}`);

    }

    shareExperience(characters: Character[], experience: number) {

        for (const member of characters) {
            const levels = member.experience.gain(experience / characters.length);

            console.log(
                `${member.name} gains ${experience / characters.length} XP`
            );

            if (levels > 0) {
                console.log(
                    `${member.name} reached level ${member.experience.level}!`
                );
            }
        }
    }

    async handlePlayerDefeat() {
        console.clear();

        console.log("Your party was defeated.");

        await this.menu.waitForAnyKey(
            "You wake up in Central Town..."
        );

        this.currentPlaceId = "central_town";

        for (const member of this.team.getAll()) {
            member.stats.hp = 1;
            member.stats.isAlive = 1;
        }
    }

    isPlayerDefeated(): boolean {
        return this.team.getAlive().length === 0;
    }


    // INVENTORY
    async showInventory() {
        const items = this.team.inventory.getAllItems();

        // display team inventory and after that display characters Items 
        console.clear();
        if (items.length > 0) {
            console.log("Your inventory contains the following items:");
            items.forEach(itemSlot => {
                console.log(`${itemSlot.quantity}- ${itemSlot.item.name}: ${itemSlot.item.description}`);
            });
        }
        else {
            console.log("Your inventory is empty.");
        }

    }

    async showTeamMenu() {

        while (true) {

            const characters = this.team.getAll();

            const options = [
                ...characters.map(character => ({
                    label: character.name,
                    execute: async () => {
                        await this.showCharacterMenu(character);
                        return true;
                    }
                })),
                {
                    label: "Back",
                    execute: async () => false
                }
            ];

            const index = await this.menu.selectMenuOption(
                "TEAM",
                options
            );

            const keepGoing =
                await options[index].execute();

            if (!keepGoing) {
                return;
            }
        }
    }

    async showCharacterMenu(character: Character) {

        while (true) {

            const options = [
                {
                    label: "View Stats",
                    execute: async () => {
                        await this.showCharacterStats(character);
                        return true;
                    }
                },
                {
                    label: "Equipment",
                    execute: async () => {
                        await this.showEquipmentMenu(character);
                        return true;
                    }
                },
                {
                    label: "Back",
                    execute: async () => false
                }
            ];

            const index =
                await this.menu.selectMenuOption(
                    character.name,
                    options
                );

            const keepGoing =
                await options[index].execute();

            if (!keepGoing) {
                return;
            }
        }
    }

    async showCharacterStats(character: Character) {

        console.clear();

        console.log(character.name);

        console.log(
            `Level: ${character.experience.level}`
        );

        console.log(
            `HP: ${character.getStat("hp")}/${character.getStat("totalHp")}`
        );

        console.log(
            `ATK: ${character.getStat("attack")}`
        );

        console.log(
            `DEF: ${character.getStat("defence")}`
        );

        await this.menu.waitForAnyKey(
            "Press any key..."
        );
    }

    async showEquipmentMenu(character: Character) {

        while (true) {

            const weapon =
                character.equipment.get("weapon");

            const armor =
                character.equipment.get("armor");

            const accessory =
                character.equipment.get("accessory");

            const options = [
                {
                    label: `Weapon: ${weapon ? weapon.name + ` [${weapon.id}]` : "Empty"}`,
                    execute: async () => true
                },
                {
                    label: `Armor: ${armor ? armor.name + ` [${armor.id}]` : "Empty"}`,
                    execute: async () => true
                },
                {
                    label: `Accessory: ${accessory ? accessory.name + ` [${accessory.id}]` : "Empty"}`,
                    execute: async () => true
                },
                {
                    label: "Back",
                    execute: async () => false
                }
            ];

            const index =
                await this.menu.selectMenuOption(
                    "Equipment",
                    options
                );

            const keepGoing =
                await options[index].execute();

            if (!keepGoing) {
                return;
            }
        }
    }

    async showInventoryMenu() {
        while (true) {
            const itemsSortedByCategory = this.team.inventory.getAllItemsSortedByCategory();

            let options: MenuChoice[] = [];

            for (const category in itemsSortedByCategory) {
                options.push({
                    label: `--- ${category.toUpperCase()} ---`,
                    execute: async () => true,
                    isDisabled: true
                });

                for (const slot of itemsSortedByCategory[category]) {
                    if (category === "equipment") {
                        let owner = this.team.getAll().find(c => c.id === slot.item.ownerId);
                        options.push({
                            label: `(${slot.quantity}) ${slot.item.name} [${slot.id}][${slot.item.id}]${slot.item.equiped ? "(Equipped)" : "(Not equipped)"}`,
                            execute: async () => {
                                await this.showItemMenu(slot.item, owner);
                                return true;
                            }
                        });
                    } else {
                        options.push({
                            label: `${slot.quantity}x ${slot.item.name}`,
                            execute: async () => {
                                return true;
                            }
                        });
                    }
                }
            }

            options.push({
                label: "Back",
                execute: async () => false
            });

            const index = await this.menu.selectMenuOption("Inventory", options);
            const keepGoing = await options[index].execute();

            if (!keepGoing) {
                return;
            }
        }
    }

    async showItemMenu(item: Item, ownerCharacter?: Character) {

        while (true) {

            const options = [];

            if (item.category === "equipment" && !item.equiped) {

                options.push({
                    label: "Equip",
                    execute: async () => {

                        await this.equipItemMenu(item, ownerCharacter?.id);

                        return false;
                    }
                });
            } else if (item.category === "equipment" && item.equiped) {

                options.push({
                    label: "Unequip",
                    execute: async () => {

                        await this.unequipItem(item, ownerCharacter?.id);

                        return false;
                    }
                });
            }

            options.push({
                label: "Back",
                execute: async () => false
            });

            const index =
                await this.menu.selectMenuOption(
                    item.name,
                    options
                );

            const keepGoing =
                await options[index].execute();

            if (!keepGoing) {
                return;
            }
        }
    }

    async equipItemMenu(item: Item, ownerId?: string) {

        const characters =
            this.team.getAll();

        const options = characters.map(character => ({
            label: character.name,
            execute: async () => {

                character.equipment.equipOrReplace(
                    item,
                    character.id
                );

                return false;
            }
        }));

        const index =
            await this.menu.selectMenuOption(
                `Equip ${item.name} to who?`,
                options
            );

        await options[index].execute();
    }

    async unequipItem(item: Item, ownerId?: string) {
        const character = this.team.getAll().find(c => c.id === ownerId);

        if (!character) {
            throw new Error("Owner character not found");
        }

        if (!item.definition.slot) {
            throw new Error("Item has no equipment slot defined");
        }

        character.equipment.unequip(item.definition.slot);
    }

}
