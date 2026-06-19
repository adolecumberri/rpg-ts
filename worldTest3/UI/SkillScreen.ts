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
    async selectSkill(skills: Skill[]): Promise<Skill> {

        const index = await this.menu.selectMenuOption(
            "CHOOSE a SKILL:",
            skills.map((s) => ({
                label: `${s.name} | Cost: ${s.cost?.mana ?? 0}`,
                execute: async () => true,
            }))
        );


        return skills[index];
    }
}