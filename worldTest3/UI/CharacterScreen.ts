import { Character, Team } from "../../src";
import { EquipmentSlot } from "../../src/classes/items/EquipmentManager";
import { Menu, MenuChoice } from "../menu/Menu";
import { ScreenManager } from "./ScreenManager";


export class CharacterScreen {
    constructor(
        private menu: Menu,
        private screenManager: ScreenManager
    ) { }

    async selectCharacter(characters: Character[]) {

        const index = await this.menu.selectMenuOption(
            "CHOOSE a CHARACTER:",
            characters.map((c) => ({
                label: `${c.name} | ATK ${c.getStat("attack")} | DEF ${c.getStat("defence")} | HP ${c.getStat("hp")}/${c.getStat("totalHp")}`,
                execute: async () => true,
            }))
        );

        return characters[index];
    }

    async showCharacterStats(character: Character) {

        console.clear();

        console.log(character.name);

        console.log(
            `Level: ${character.experience.level}`
        );

        console.log(
            `HP: ${character.getStat("hp")}/${character.getStat("totalHp")}`
        );

        console.log(
            `ATK: ${character.getStat("attack")}`
        );

        console.log(
            `DEF: ${character.getStat("defence")}`
        );

        await this.menu.waitForAnyKey(
            "Press any key..."
        );
    }

    async showCharacterOptions(character: Character) {

        while (true) {

            const options = [
                {
                    label: "View Stats",
                    execute: async () => {
                        await this.showCharacterStats(character);
                        return true;
                    }
                },
                {
                    label: "Equipment",
                    execute: async () => {
                        await this.screenManager.character.showEquipmentFromCharacter(character);
                        return true;
                    }
                },
                {
                    label: "Back",
                    execute: async () => false
                }
                //TODO: add custom options.
            ];

            const index =
                await this.menu.selectMenuOption(
                    character.name,
                    options
                );

            const keepGoing =
                await options[index].execute();

            if (!keepGoing) {
                return;
            }
        }
    };

    async showEquipmentFromCharacter(character: Character) {

        while (true) {
            const slotOrder: EquipmentSlot[] = ["weapon", "armor", "accessory"];
            const equippedSlots = character.equipment.getAllSlots();

            const options = [
                ...slotOrder.map(slot => {
                    const equippedItem = equippedSlots[slot];

                    return {
                        label: `${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${equippedItem ? equippedItem.name + ` [${equippedItem.id}]` : "Empty"}`,
                        execute: async () => true
                    };
                }),
                {
                    label: "Back",
                    execute: async () => false
                }
            ];

            const index =
                await this.menu.selectMenuOption(
                    "Equipment",
                    options
                );

            const keepGoing =
                await options[index].execute();

            if (!keepGoing) {
                return;
            }
        }

    }
}