import { Character, Experience, Item, Stats } from "../../src";
import { defaultInventory } from "../InitialData/Inventory";


export function CreateMainCharacter(name: string = "hero"): Character {
    const mainCharacter = new Character({
        name: name,
        id: name,
        stats: new Stats({
            hp: 100,
            totalHp: 100,
            attack: 10,
            defence: 5,
        }),
        experience: new Experience({
            growthFunction: ({ level }) => {
                return level * 50;
            },
        }),
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