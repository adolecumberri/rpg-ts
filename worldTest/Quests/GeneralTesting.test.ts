import { Game } from "../Game/Game";
import { Quest } from "../Quests/Quest";



export class GeneralTestingQuest implements Quest {

    id = "general_testing";

    async start(game: Game) {


        const centralTownPlace = game.getPlace("central_town");
        if (centralTownPlace === undefined) {
            throw new Error("Central Town place not found.");
        }

        centralTownPlace.actions.push({
            id: "a",
            label: "a",
            onSelect: async (game) => {
                game.getPlace("central_town");

                


                return true;
            }
        });
    }
}