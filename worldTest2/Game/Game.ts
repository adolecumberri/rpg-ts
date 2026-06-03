import { Combat, CombatResult, Team } from "../../src";
import { uniqueID } from "../../src/helpers/common.helpers";
import { Menu } from "../menu/Menu";
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

        const options = [
            ...placeActions,
            ...npcInteractions,
            ...travelOptions,
            {
                label: "Display Team",
                execute: async () => {
                    console.clear();
                    if (this.team.getAll().length > 0) {
                        console.log("Your team consists of the following characters:");
                        this.team.getAll().forEach(character => {
                            console.log(`- ${character.name} | ATK ${character.stats.attack} | DEF ${character.stats.defence} | HP ${character.stats.hp}/${character.stats.totalHp}`);
                        });
                    } else {
                        console.log("There are no NPCs here.");
                    }
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
                            console.log(`- ${npc.character.name} | ATK ${npc.character.stats.attack} | DEF ${npc.character.stats.defence} | HP ${npc.character.stats.hp}/${npc.character.stats.totalHp}`);
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
            options
        );

        return await options[index].execute();

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

    addConnectionToPlace(placeId: string, to: string, label: string) {
        const place = this.places.get(placeId);
        if (!place) {
            throw new Error(`Place not found: ${placeId}`);
        }
        place.connections.push({ label, to });
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

        place.npcs = place.npcs.filter(n => n.id !== npc.id);

        this.team.addCharacter(npc.character);
        return true;
    }


    // COMBAT
    async fightNPC(placeId: string, npcId: string) {

        const npc = this.getNPC(placeId, npcId);

        if (!npc) {
            return;
        }

        const playerCharacters = this.team;

        const combatResult = this.combat.auto(
            playerCharacters,
            npc.character,
        );

        await this.showCombatResult(combatResult);

        if (combatResult.winner === "left") {
            if (npc.onDefeat) {
                await npc.onDefeat?.(this, npc, placeId);
            }
        }

        if (combatResult.winner === "right") {
            await this.handlePlayerDefeat();
        }
    }

    private async showCombatResult(result: CombatResult) {
        console.clear();
        console.log("Combat Result:");
        console.log(`Winner: ${result.winner}`);
        console.log(`Rounds: ${result.rounds}`);

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
}
