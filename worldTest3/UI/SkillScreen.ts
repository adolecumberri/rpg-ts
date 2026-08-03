import { Character, Inventory, Item } from "../../src";
import { Menu } from "../menu/Menu";
import { ScreenManager } from "./ScreenManager";
import { Skill } from "../../src/classes/Skills";

export class SkillScreen {
    constructor(
        private menu: Menu,
        private screenManager: ScreenManager
    ) { }

    async selectSkillsFromCharacter(character: Character) {
        const index = await this.menu.selectMenuOption(
            "CHOOSE a SKILL:",
            character.skills.map((s) => ({
                label: `${s}`,
                execute: async () => true,
            }))
        );

        return character.skills[index];
    }

    // upgrade this function to return the index of the selected skill instead of the skill itself, also add a last option called "back" that returns null

    async selectSkill(skills: Skill[]): Promise<number | null> {

        const index = await this.menu.selectMenuOption(
            "CHOOSE a SKILL:",
            skills.map((s) => ({
                label: `${s.name} | Cost: ${s.cost?.mana ?? 0}`,
                execute: async () => true,
            })).concat([{
                label: "Back",
                execute: async () => true,
            }])
        );

        if (index === skills.length) {
            return null;
        }
        return index;
    }
}