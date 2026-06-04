import { Item } from "../../src";


export const defaultInventory = {
    rusty_sword: new Item({
        category: "equipment",
        id: "rusty_sword",
        name: "Rusty Sword",
        description: "An old and worn sword. Better than nothing.",
    }),
    wooden_shield: new Item({
        category: "equipment",
        id: "wooden_shield",
        name: "Wooden Shield",
        description: "A basic wooden shield. Provides minimal protection.",
    }),
    gold_coin: new Item({
        category: "quest",
        id: "gold_coin",
        name: "Gold Coin",
        description: "",
    }),
    health_potion: new Item({
        category: "consumable",
        id: "health_potion",
        name: "Health Potion",
        description: "Restores 50 HP when used.",
    })
} as const;