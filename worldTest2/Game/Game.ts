import { uniqueID } from "../../src/helpers/common.helpers";
import { Menu } from "../menu/Menu";
import { Place, PLACES, PlaceTrigger } from "../Places/Place";

export class Game {
    private running = true;
    menu: Menu;

    private places: Map<string, Place> = new Map();
    private currentPlaceId: string = "default";
    private previousPlaceId: string = "default";

    private lockedConnections = new Set<string>(); //`${fromId}->${toId}`
    private executedTriggers = new Set<string>();

    constructor(menu: Menu) {
        this.menu = menu;

        this.currentPlaceId = "central_town";

        this.loadPlaces(PLACES);
    }

    async start() {
        while (this.running) {
            this.running = await this.mainLoop();
        }

        this.menu.cleanupInput();
        process.stdout.write("\nGoodbye.\n");
    }

    private async mainLoop() {
        const place = this.getCurrentPlace();

        const travelOptions = (place.connections ?? [])
            .filter(conn => !this.isConnectionLocked(place.id, conn.to))
            .map(conn => ({
                label: conn.label,
                execute: async () => {
                    await this.travelTo(conn.to);
                    return true;
                },
            }));

        const placeActions = (place.actions ?? []).map(action => ({
            label: action.label,
            execute: async () => action.onSelect(this),
        }));


        const options = [
            ...placeActions,
            ...travelOptions,
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

    private async travelTo(placeId: string) {
        if (!this.places.has(placeId)) {
            throw new Error(`Place not found: ${placeId}`);
        }

        const from = this.currentPlaceId;
        const to = placeId;

        const fromPlace = this.places.get(from)!;
        const toPlace = this.places.get(to)!;

        // EXIT triggers
        await this.runTriggers(fromPlace.onExit, to);

        this.previousPlaceId = from;
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
}
