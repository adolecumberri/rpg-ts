import { Game } from "../Game/game";

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
};

export const PLACES: Record<string, Place> = {
    central_town: {
        id: "central_town",
        name: "Central Town",
        description: "The starting point of your journey.",

        connections: [
            { label: "Go North", to: "north_town" },
            { label: "Go South", to: "south_town" },
        ],
        actions: [
            {
                id: "discover_east_east_town",
                label: "Discover the town",
                description: "Look around and discover the town.",
                onSelect: async (game) => {

                    console.clear();

                    console.log("You explore the town and find various interesting places.");
                    game.addPlace({
                        id: "East-East town",
                        name: "East-East Town",
                        description: "A hidden town to the east.",
                        connections: [
                            { label: "Return to Central", to: "central_town" },
                        ],
                    });
                    //para que puedan encontrarse.
                    game.addConnectionToPlace("central_town", "East-East town", "Go East-East");
                    game.removeActionFromPlace("central_town", "discover_east_east_town");


                    await game.menu.waitForAnyKey("Press any key to continue...");
                    return true;
                }
            }
        ],
        onEnter: [
            {
                id: "welcome_message",
                once: true,
                effects: [
                    async (game) => {
                        await game.menu.waitForAnyKey("A strange feeling appears...");
                    },
                ],
            }
        ]
    },

    north_town: {
        id: "north_town",
        name: "North Town",
        description: "A cold northern settlement.",

        connections: [
            { label: "Return to Central", to: "central_town" },
        ],
    },

    south_town: {
        id: "south_town",
        name: "South Town",
        description: "A warm southern village.",

        connections: [
            { label: "Return to Central", to: "central_town" },
        ],
    },
} as const;