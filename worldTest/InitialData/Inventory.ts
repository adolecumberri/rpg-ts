import { Item } from "../../src";
import { uniqueID } from "../../src/helpers/common.helpers";


export const defaultInventory = {
    rusty_sword: () => new Item({
        id: uniqueID(),
        category: "equipment",
        name: "Rusty Sword",
        description: "An old and worn sword. Better than nothing.",
        slot: "weapon",
        buyValue: 50,
        sellValue: 25,
        effects: [
            {
                stat: "attack",
                typeOfModification: "BUFF_FIXED",
                value: 2,
            },
        ],
    }),
    wooden_shield: () => new Item({
        id: uniqueID(),
        category: "equipment",
        name: "Wooden Shield",
        description: "A basic wooden shield. Provides minimal protection.",
        slot: "armor",
        buyValue: 40,
        sellValue: 20,
        effects: [
            {
                stat: "defence",
                typeOfModification: "BUFF_FIXED",
                value: 5,
            },
        ],

    }),
    gold_coin: () => new Item({
        category: "quest",
        id: "gold_coin",
        name: "Gold Coin",
        description: "",
    }),
    health_potion: () => new Item({
        category: "consumable",
        id: "health_potion",
        name: "Health Potion",
        description: "Restores 30 HP when used.",
        buyValue: 10,
        sellValue: 5,
        onUse: (item, target) => {

            target.stats.hp = Math.min(
                target.getStat("totalHp"),
                target.stats.hp + 30
            );

            return true;
        }
    }),
    cursed_ring: () => new Item({
        name: "Cursed Ring",
        buyValue: 40,
        sellValue: 32,
        effects: [
            {
                stat: "attack",
                typeOfModification: "BUFF_PERCENTAGE",
                value: 20,
            },
            {
                stat: "hp",
                typeOfModification: "DEBUFF_PERCENTAGE",
                value: 30,
            },
        ],
    }),
    cave_key: () => new Item({
        id: "cave_key",
        category: "key",

        name: "Cave Key",

        description:
            "Opens the entrance to the Cave.",
    })
} as const;