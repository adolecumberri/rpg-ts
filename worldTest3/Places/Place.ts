import { Game } from "../Game/game";
import { NPC } from "../NPC/npc";
import { innAction } from "./InnAction";
import { CENTRAL_SHOP, shopAction } from "./Shop";

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

    canTravel?: (game: Game) => boolean | Promise<boolean>;
    lockedMessage?: string;
    locked?: boolean;

    requiredItemId?: string;
};

export type Place = {
    id: string;
    name: string;
    description: string;

    actions: PlaceAction[];
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
            // {
            //     label: "Enter Cave",
            //     to: "cave",

            //     canTravel: (game) =>
            //         game.hasItem("cave_key"),

            //     lockedMessage:
            //         "The cave entrance is locked."
            // }
        ],
        actions: [

            // innAction,
            // shopAction,
        ],
        onEnter: [

        ]
    },
    cave: {
        id: "cave",
        name: "Cave",
        description: "A dark and mysterious cave.",
        actions: [
            {
                label: "Explore the cave",
                onSelect: async (game) => {
                    console.clear();
                    console.log("You venture into the cave and find a hidden treasure!");
                    await game.menu.waitForAnyKey("Press any key...");
                    return true;
                }
            }
        ],
        connections: [
            {
                label: "Return to Central Town",
                to: "central_town"
            }
        ],
    }

} as const;