import { Game } from "./Game/game";
import { Menu } from "./menu/Menu";

const menu = new Menu();
const game = new Game(menu);

game.start().catch((err) => {
    menu.cleanupInput();
    console.error(err);
    process.exit(1);
});