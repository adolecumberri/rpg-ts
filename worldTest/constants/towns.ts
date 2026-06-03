import { Place, PlaceDefinition, World } from "../../src";


export const Towns: PlaceDefinition[] = [
    {
        id: "town_1",
        name: "North Town",
        type: "town",
        description: "A quiet town to the north. The wind smells like pine and smoke.",
        options: [],
        connections: [{ to: "town_2" }],
    },
    {
        id: "town_2",
        name: "Central Town",
        type: "town",
        description: "You stand at the crossroads in the center of the region.",
        options: [],
        connections: [{ to: "town_1" }, { to: "town_3" }, { to: "inn_1" }],
    },
    {
        id: "town_3",
        name: "South Town",
        type: "town",
        description: "A market town full of travelers and carts.",
        options: [],
        connections: [{ to: "town_2" }],
    },
    {
        id: "inn_1",
        name: "Crossroads Inn",
        type: "shop",
        description: "A warm inn with one powerful restorative service.",
        options: [],
        connections: [{ to: "town_2" }],
    },
];