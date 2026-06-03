import { Game } from "../Game/game";
import { NPC } from "../NPC/npc";
import { innAction } from "./InnAction";

const showMessage = (text: string) =>
    async (game: Game) => {
        console.clear();
        console.log(text);
        await game.menu.waitForAnyKey("Press any key...");
    };

export type PlaceTrigger = {
    id: string;

    once?: boolean;

    condition?: (game: Game, from?: string) => boolean | Promise<boolean>;

    effects: Array<(game: Game, from?: string) => Promise<void>>;
};

export type PlaceAction = {
    id?: string;
    label: string;
    description?: string;
    onSelect: (game: Game) => Promise<boolean>;

};

export type PlaceConnection = {
    label: string;
    to: string;

    locked?: boolean; // default false
};

export type Place = {
    id: string;
    name: string;
    description: string;

    actions?: PlaceAction[];
    connections: PlaceConnection[];

    onEnter?: PlaceTrigger[];
    onExit?: PlaceTrigger[];

    npcs?: NPC[];
};

export const PLACES: Record<string, Place> = {
    central_town: {
        id: "central_town",
        name: "Central Town",
        description: "The starting point of your journey.",

        connections: [

        ],
        actions: [

            innAction,

        ],
        onEnter: [

        ]
    },


} as const;