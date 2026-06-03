import { Character, Experience, Stats } from "../src";
import { Game } from "./Game/game";
import { Menu } from "./menu/Menu";
import { FightRandomQuest } from "./Quests/FightRandom";
import { StarterQuest } from "./quests/ResidentQuest";

const menu = new Menu();
const game = new Game(menu);


const mainCharacter = new Character({
    name: "Hero",
    id: "hero",
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

mainCharacter.experience.onLevelUp = () => {
    mainCharacter.stats.attack += 2;
    mainCharacter.stats.defence += 1;
    mainCharacter.stats.totalHp += 10;
    mainCharacter.stats.hp = mainCharacter.stats.totalHp;
};

game.team.addCharacter(mainCharacter);
game.addQuest(new FightRandomQuest());

game.start().catch((err) => {
    menu.cleanupInput();
    console.error(err);
    process.exit(1);
});