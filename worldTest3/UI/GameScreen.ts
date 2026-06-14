import { Character, Inventory, InventorySlot, Item, Team } from "../../src";
import type { EquipmentSlot } from "../../src/classes/items/EquipmentManager";
import { Menu, MenuChoice } from "../menu/Menu";
import { ScreenManager } from "./ScreenManager";

export class GameScreens {
    constructor(
        private menu: Menu,
        private screenManager: ScreenManager
    ) { }


    async showTeam(team: Team): Promise<void> {

        while (true) {

            const characters = team.getAll();

            const options = [
                ...characters.map(character => ({
                    label: character.name,
                    execute: async () => {
                        await this.screenManager.character.showCharacterOptions(character);
                        return true;
                    }
                })),
                {
                    label: "Back",
                    execute: async () => false
                }
            ];

            const index = await this.menu.selectMenuOption(
                "TEAM",
                options
            );

            const keepGoing =
                await options[index].execute();

            if (!keepGoing) {
                return;
            }
        }
    };

    async showTeamInventory(team: Team) {
        while (true) {
            const itemsSortedByCategory = team.inventory.getAllItemsSortedByCategory();

            let options: MenuChoice[] = [];

            for (const category in itemsSortedByCategory) {
                options.push({
                    label: `--- ${category.toUpperCase()} ---`,
                    execute: async () => true,
                    isDisabled: true
                });

                for (const slot of itemsSortedByCategory[category]) {
                    if (category === "equipment") {
                        let owner = team.getAll().find(c => c.id === slot.item.ownerId);
                        options.push({
                            label: `(${slot.quantity}) ${slot.item.name} [${slot.id}][${slot.item.id}]${slot.item.equiped ? "(Equipped)" : "(Not equipped)"}`,
                            execute: async () => {
                                await this.screenManager.inventory.showEquipableItemMenu(slot.item, owner, team.getAll());
                                return true;
                            }
                        });
                    } else if (category === "consumable") {
                        options.push({
                            label: `(${slot.quantity}) ${slot.item.name} [${slot.id}][${slot.item.id}]${slot.item.equiped ? "(Equipped)" : "(Not equipped)"}`,
                            execute: async () => {
                                await this.screenManager.inventory.showConsumableItemMenu(slot.item, team.inventory, team.getAll());
                                return true;
                            }
                        });
                    } else {
                        options.push({
                            label: `${slot.quantity}x ${slot.item.name}`,
                            execute: async () => {
                                return true;
                            }
                        });
                    }
                }
            }

            options.push({
                label: "Back",
                execute: async () => false
            });

            const index = await this.menu.selectMenuOption("Inventory", options);
            const keepGoing = await options[index].execute();

            if (!keepGoing) {
                return;
            }
        }
    }

    equipableItemSelectionMenu = async (items: Item[]) => {
        // 

        const index = await this.menu.selectMenuOption(
            "CHOOSE AN EQUIPABLE ITEM",
            items.map((item) => {
                if (item.category !== "equipment") return;
                return {
                    label: `${item.name} [${item.id}]`,
                    execute: async () => true,
                }
            }).filter(Boolean) as MenuChoice[]
        );

        return items[index];
    };
}