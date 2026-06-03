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
            { label: "Go North", to: "north_town" },
            { label: "Go South", to: "south_town" },
        ],
        actions: [

            innAction,
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
            },
        ],
        onEnter: [
            {
                id: "welcome_message",
                once: true,
                effects: [
                    async (game) => {
                        game.enqueueUI(async () => {
                            console.clear();
                            console.log("A strange feeling appears...");
                            await game.menu.waitForAnyKey("Press any key...");
                        });
                    },

                    async (game) => {
                        game.enqueueUI(async () => {
                            console.clear();
                            console.log("A strange feeling appears... 2");
                            await game.menu.waitForAnyKey("Press any key...");
                        });
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

        onExit: [
            {
                id: "goodbye_message",
                once: true,
                effects: [
                    async (game) => {
                        game.enqueueUI(async () => {
                            console.clear();
                            console.log("You feel a chill as you leave...");
                            await game.menu.waitForAnyKey("Press any key...");
                        });
                    },
                ],
            }
        ]
    },

    south_town: {
        id: "south_town",
        name: "South Town",
        description: "A warm southern village.",

        connections: [
            { label: "Return to Central", to: "central_town" },
        ],
    },
    // inn: {
    //     id: "rest",
    //     name: "Inn",
    //     description: "Rest at Inn",
    //     actions: [
    //         {
    //             id: "rest_at_inn",
    //             label: "Rest at the Inn",
    //             description: "Rest and recover your party's health.",
    //             onSelect: async (game) => {


    //                 for (const member of game.team.getAll()) {
    //                     member.stats.hp = member.stats.totalHp;
    //                     member.stats.isAlive = 1;
    //                 }

    //                 await game.menu.waitForAnyKey(
    //                     "Your party feels refreshed."
    //                 );

    //                 return true;
    //             }

    //         }
    //     ],
    //     connections: [
    //         { label: "Return to Central", to: "central_town" },
    //     ],
    // }
} as const;