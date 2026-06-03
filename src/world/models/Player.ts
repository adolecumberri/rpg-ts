import { Character } from "../../classes/Character";
import { Team } from "../../classes/Team";
import { uniqueID } from "../../helpers/common.helpers";
import { PlaceId, PlaceOption, TravelInfo } from "./Place";
import { World } from "./World";

export type PlayerAction = {
    type: "look_options" | "travel" | "add_character" | "remove_character" | (string & {});
    placeId?: PlaceId;
    timestamp: number;
    data?: Record<string, unknown>;
};

export type PlayerConstructor = {
    id?: string;
    name?: string;
    team?: Team;
    startPlaceId?: PlaceId;
    maxTeamSize?: number;
};

export class Player {
    readonly id: string;
    name: string;
    readonly team: Team;
    readonly maxTeamSize: number;
    currentPlaceId: PlaceId;
    private actions: PlayerAction[] = [];

    constructor(config: PlayerConstructor = {}) {
        this.id = config.id ?? uniqueID();
        this.name = config.name ?? "player";
        this.team = config.team ?? new Team();
        this.maxTeamSize = config.maxTeamSize ?? 4;
        this.currentPlaceId = config.startPlaceId ?? "unknown";

        if (this.team.count() > this.maxTeamSize) {
            throw new Error(`Player team cannot be bigger than ${this.maxTeamSize}.`);
        }
    }

    addCharacter(character: Character): void {
        if (this.team.count() >= this.maxTeamSize) {
            throw new Error(`Player team is full (max ${this.maxTeamSize}).`);
        }

        this.team.addCharacter(character);
        this.recordAction({
            type: "add_character",
            placeId: this.currentPlaceId,
            timestamp: Date.now(),
            data: {
                characterId: character.id,
            },
        });
    }

    removeCharacter(characterId: string): void {
        this.team.removeCharacter(characterId);
        this.recordAction({
            type: "remove_character",
            placeId: this.currentPlaceId,
            timestamp: Date.now(),
            data: {
                characterId,
            },
        });
    }

    lookOptions(world: World): PlaceOption[] {
        const place = world.getPlace(this.currentPlaceId);
        const options = place.getOptions();

        this.recordAction({
            type: "look_options",
            placeId: place.id,
            timestamp: Date.now(),
            data: {
                optionIds: options.map((option) => option.id),
            },
        });

        return options;
    }

    travelTo(world: World, to: PlaceId, info: TravelInfo = {}): PlaceId {
        const result = world.travel({
            from: this.currentPlaceId,
            to,
            info: {
                ...info,
                playerId: this.id,
            },
        });

        this.currentPlaceId = result.to.id;

        this.recordAction({
            type: "travel",
            placeId: this.currentPlaceId,
            timestamp: Date.now(),
            data: {
                from: result.from.id,
                to: result.to.id,
                info,
                triggeredEventIds: result.triggeredEvents.map((event) => event.id),
            },
        });

        return this.currentPlaceId;
    }

    recordAction(action: PlayerAction): void {
        this.actions.push(action);
    }

    getActions(): PlayerAction[] {
        return [...this.actions];
    }
}
