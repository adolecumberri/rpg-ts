import { Game } from "./Game/game";
import { Menu } from "./menu/Menu";
import { StarterQuest } from "./quests/ResidentQuest";

const menu = new Menu();
const game = new Game(menu);

game.addQuest(new StarterQuest());

game.start().catch((err) => {
    menu.cleanupInput();
    console.error(err);
    process.exit(1);
});