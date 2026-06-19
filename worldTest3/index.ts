import { Game } from "./Game/game";
import { defaultInventory } from "./InitialData/Inventory";
import { Menu } from "./menu/Menu";
import { CreateMainCharacter } from "./NPC/mainCharacter";
import { FightRandomQuest } from "./Quests/FightRandom";
import "./augmentations";
import { FightRandomGroup } from "./Quests/FightRandomGroup";
import { FightGoblin } from "./Quests/FightGoblin.test";


const menu = new Menu();
const game = new Game(menu);


game.team.addCharacter(CreateMainCharacter());
game.team.addCharacter(CreateMainCharacter("companion"));

game.team.inventory.addItem(defaultInventory.wooden_shield());
game.team.inventory.addItem(defaultInventory.rusty_sword());
game.team.inventory.addItem(defaultInventory.rusty_sword());
game.team.inventory.addItem(defaultInventory.cave_key());
game.team.gold += 20;
game.team.inventory.addItem(defaultInventory.health_potion(), 3);

game.addQuest(new FightRandomGroup());
game.addQuest(new FightGoblin());

game.start().catch((err) => {
    menu.cleanupInput();
    console.error(err);
    process.exit(1);
});