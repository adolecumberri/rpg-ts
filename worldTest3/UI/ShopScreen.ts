import { Character, Team } from "../../src";
import { EquipmentSlot } from "../../src/classes/items/EquipmentManager";
import { Menu, MenuChoice } from "../menu/Menu";
import { Shop, ShopEntry } from "../Places/Shop";
import { ScreenManager } from "./ScreenManager";


export class ShopScreen {
    constructor(
        private menu: Menu,
        private screenManager: ScreenManager
    ) { }

    // async showShopMenu(team: Team, shop: Shop) {

    //     while (true) {

    //         const options = [
    //             {
    //                 label: "Buy items",
    //                 execute: async () => {
    //                     await this.showShopBuyMenu(team, shop);
    //                     return true;
    //                 }
    //             },
    //             {
    //                 label: "Sell items",
    //                 execute: async () => {
    //                     await this.showShopSellMenu(team, shop);
    //                     return true;
    //                 }
    //             },
    //             {
    //                 label: "Leave",
    //                 execute: async () => false
    //             }
    //         ];  
    //             }

    //     // while (true) {
    //     //     const options = [
    //     //         ...shop.entries.map(entry => ({
    //     //             label: `${entry.item.name} - ${entry.buyPrice}g`,
    //     //             execute: async () => {
    //     //                 await this.buyItem(entry, team);
    //     //                 return true;
    //     //             }
    //     //         }))
    //     //     ];

    //     //     const index =
    //     //         await this.menu.selectMenuOption(
    //     //             `${shop.name} | Gold: ${team.gold}`,
    //     //             options
    //     //         );

    //     //     const keepGoing =
    //     //         await options[index].execute();

    //     //     if (!keepGoing) {
    //     //         return;
    //     //     }
    //     // }
    // }

    async showBuyMenu(team: Team, shop: Shop, buyItem: (entry: ShopEntry, team: Team) => Promise<void>) {

        while (true) {
            const options = [
                ...shop.entries.map(entry => ({
                    label: `${entry.item.name} - ${entry.buyPrice}g`,
                    execute: async () => {
                        await buyItem(entry, team);
                        return true;
                    }
                })),
                {
                    label: "Back",
                    execute: async () => false
                }
            ];

            const index =
                await this.menu.selectMenuOption(
                    `${shop.name} | Gold: ${team.gold}`,
                    options
                );

            const keepGoing =
                await options[index].execute();

            if (!keepGoing) {
                return;
            }
        }
    }

    async showSellMenu(team: Team, shop: Shop, sellItem: (entry: ShopEntry, team: Team) => Promise<void>) {

        while (true) {
            const options = [
                ...team.inventory.getAllNotEquipedItems().map(slot => ({
                    label: `${slot.item.name} - ${slot.item.sellValue}g`,
                    execute: async () => {
                        await sellItem({ item: slot.item, buyPrice: slot.item.buyValue ?? 0, sellPrice: slot.item.sellValue ?? 0 }, team);
                        return true;
                    }
                })),
                {
                    label: "Back",
                    execute: async () => false
                }
            ];

            const index =
                await this.menu.selectMenuOption(
                    `${shop.name} | Gold: ${team.gold}`,
                    options
                );

            const keepGoing =
                await options[index].execute();

            if (!keepGoing) {
                return;
            }
        };
    };





}
