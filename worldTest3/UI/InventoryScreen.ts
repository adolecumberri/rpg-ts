import { Character, Inventory, Item } from "../../src";
import { Menu } from "../menu/Menu";
import { ScreenManager } from "./ScreenManager";


export class InventoryScreen {
    constructor(
        private menu: Menu,
        private screenManager: ScreenManager
    ) { }


    async showEquipableItemMenu(item: Item, ownerCharacter: Character | undefined, characters: Character[]) {

        while (true) {

            const options = [];

            if (item.category === "equipment" && !item.equiped) {
                options.push({
                    label: "Equip",
                    execute: async () => {

                        const selectedCharacter = await this.screenManager.character.selectCharacter(characters || []);

                        selectedCharacter.equipment.equipOrReplace(
                            item,
                            selectedCharacter.id
                        );

                        return false;
                    }
                });
            } else if (item.category === "equipment" && item.equiped) {
                options.push({
                    label: "Unequip",
                    execute: async () => {
                        if (item.definition.slot && ownerCharacter) {
                            ownerCharacter.equipment.unequip(item.definition.slot);
                        }

                        return false;
                    }
                });
            }

            options.push({
                label: "Back",
                execute: async () => false
            });

            const index =
                await this.menu.selectMenuOption(
                    item.name,
                    options
                );

            const keepGoing =
                await options[index].execute();

            if (!keepGoing) {
                return;
            }
        }
    }

    // options: Use and Back
    async showConsumableItemMenu(item: Item, inventory: Inventory, itemConsumers: Character[]) {

        while (true) {
            const options = [];

            if (item.category === "consumable") {
                options.push({
                    label: "Use",
                    execute: async () => {
                        const selectedCharacter = await this.screenManager.character.selectCharacter(itemConsumers || []);
                        const consumed = inventory.useItem(item.id, selectedCharacter);

                        if (consumed) {
                            console.log(`You used ${item.name}.`);
                        } else {
                            console.log(`Failed to use ${item.name}.`);
                        }
                        return false;
                    }
                });
            }

            options.push({
                label: "Back",
                execute: async () => false
            });

            const index = await this.menu.selectMenuOption(item.name, options);
            const keepGoing = await options[index].execute();

            if (!keepGoing) {
                return;
            }
        }
    };
}