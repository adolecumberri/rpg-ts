import { Character, Experience, Item, Stats } from "../../src";
import { SKILLS } from "../Combat/SkillsConstants";
import { defaultInventory } from "../InitialData/Inventory";


export function CreateMainCharacter(name: string = "hero"): Character {
    const mainCharacter = new Character({
        name: name,
        id: name,
        stats: new Stats({
            hp: 50,
            totalHp: 100,
            attack: 10,
            defence: 5,
        }),
        experience: new Experience({
            growthFunction: ({ level }) => {
                return level * 50;
            },
        }),
        skills: [
            SKILLS.fireball,
            SKILLS.basicAttack,
            SKILLS.groupHeal
        ]
    });

    mainCharacter.experience.onLevelUpHandler = ({ newLevel }) => {
        console.clear();
        console.log(`${mainCharacter.name} leveled up to level ${newLevel}!`);
        mainCharacter.stats.attack += 2;
        mainCharacter.stats.defence += 1;
        mainCharacter.stats.totalHp += 10;
        mainCharacter.stats.hp = mainCharacter.stats.totalHp;
    };

    return mainCharacter;
}