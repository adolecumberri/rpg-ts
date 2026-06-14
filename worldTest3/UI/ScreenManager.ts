import { Menu } from "../menu/Menu";
import { CharacterScreen } from "./CharacterScreen";
import { GameScreens } from "./GameScreen";
import { InventoryScreen } from "./InventoryScreen";
import { ShopScreen } from "./ShopScreen";


export class ScreenManager {

    character: CharacterScreen;
    inventory: InventoryScreen;
    game: GameScreens;
    shop: ShopScreen;

    constructor(menu: Menu) {

        this.character =
            new CharacterScreen(menu, this);

        this.inventory =
            new InventoryScreen(menu, this);

        this.game =
            new GameScreens(menu, this);

        this.shop = new ShopScreen(menu, this);
    }
}