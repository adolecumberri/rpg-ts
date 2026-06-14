import { Item } from "../../src";
import { uniqueID } from "../../src/helpers/common.helpers";


export const defaultInventory = {
    rusty_sword: () => new Item({
        id: uniqueID(),
        category: "equipment",
        name: "Rusty Sword",
        description: "An old and worn sword. Better than nothing.",
        slot: "weapon",
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
    })
} as const;