import { Item } from "../../src";
import { defaultInventory } from "../InitialData/Inventory";
import { PlaceAction } from "./Place";

export type ShopEntry = {
    item: Item;

    buyPrice: number;
    sellPrice: number;
};

export class Shop {

    public readonly name: string;
    public readonly entries: ShopEntry[];
    public readonly allowSelling: boolean;

    constructor(
        name: string,
        entries: {
            item: Item;

            buyPrice?: number;
            sellPrice?: number;
        }[],
        allowSelling = true
    ) {
        entries.forEach(entry => {
            entry.buyPrice = entry.buyPrice
                ?? entry.item.buyValue ?? 0;
            entry.sellPrice = entry.sellPrice
                ?? entry.item.sellValue ?? 0;
        });

        this.name = name;
        this.entries = entries as ShopEntry[];
        this.allowSelling = allowSelling;
    }
}

export const CENTRAL_SHOP = new Shop(
    "Central Shop",
    [
        {
            item: defaultInventory.health_potion(),
        },
        {
            item: defaultInventory.rusty_sword(),
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