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

    async selectMultipleCharacters(
        characters: Character[],
        count: number = 1,
        multipleSelections: boolean = false
    ): Promise<Character[]> {

        const result: Character[] = [];
        const selectedCount = new Map<string, number>();
        let remaining = count;

        while (remaining > 0) {

            const options: MenuChoice[] = [
                ...characters.map((c) => {
                    const times = selectedCount.get(c.id) ?? 0;
                    const xMarks = times > 0 ? "X".repeat(times) + " " : "";
                    const alreadySelected = !multipleSelections && times > 0;
                    return {
                        label: `${xMarks}${c.name} | ATK ${c.getStat("attack")} | DEF ${c.getStat("defence")} | HP ${c.getStat("hp")}/${c.getStat("totalHp")}`,
                        execute: async () => true,
                        isDisabled: alreadySelected,
                    };
                }),
                {
                    label: "Done",
                    execute: async () => false,
                },
            ];

            const index = await this.menu.selectMenuOption(
                `SELECT CHARACTERS (${count - remaining + 1}/${count}):`,
                options
            );

            if (index === characters.length) {
                break;
            }

            const picked = characters[index];
            selectedCount.set(picked.id, (selectedCount.get(picked.id) ?? 0) + 1);
            result.push(picked);
            remaining -= 1;
        }

        return result;
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
                    label: "View Status Effects",
                    execute: async () => {
                        await this.screenManager.character.showStatusEffectsFromCharacter(character);
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

    };

    async showStatusEffectsFromCharacter(character: Character) {

        while (true) {
            const statusEffects = character.statusManager.statuses.values();

            const options = [
                ...Array.from(statusEffects).map(status => ({
                    label: `${character.name}: ${status.definition.name} | Duration: ${status.definition.statsAffected.map(stat => `${stat.from} -> ${stat.to} (${stat.value})`).join(", ")}`,
                    execute: async () => true
                })),
                {
                    label: "Back",
                    execute: async () => false
                }
            ];

            const index = await this.menu.selectMenuOption(
                "STATUS EFFECTS",
                options
            );

            const keepGoing = await options[index].execute();

            if (!keepGoing) {
                return;
            }
        }
    }
}