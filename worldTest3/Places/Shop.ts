import { Item } from "../../src";
import { defaultInventory } from "../InitialData/Inventory";
import { PlaceAction } from "./Place";

export type ShopEntry = {
    item: Item;
    price: number;
};

export class Shop {
    constructor(
        public readonly name: string,
        public readonly entries: ShopEntry[],
    ) { }
}

export const CENTRAL_SHOP = new Shop(
    "Central Shop",
    [
        {
            item: defaultInventory.health_potion(),
            price: 10,
        },
        {
            item: defaultInventory.rusty_sword(),
            price: 50,
        },
    ]
);

// ShopAction.ts

export const shopAction: PlaceAction = {
    id: "shop",
    label: "Visit Shop",

    onSelect: async (game) => {

        await game.openShop(CENTRAL_SHOP);

        return true;
    }
};