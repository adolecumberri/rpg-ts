import { Character, Stats, Team } from "../../src";
import { uniqueID } from "../../src/helpers/common.helpers";
import { CombatController } from "../Combat/CombatController";
import { Game } from "../Game/game";
import { NPC } from "../NPC/npc";
import { createCharacter } from "../Utils/Character.utils";
import { Quest } from "../quests/Quest";

export class FightRandomGroup implements Quest {
    id = "fight_random";

    timesDefeated = 0;

    npcStats = {
        attack: 6,
        hp: 5,
        totalHp: 5,
        defence: 0,
    };

    createTeam(numberOfCharacters: number): Team {

        const teamCharacters = Array.from({ length: numberOfCharacters }, () => {
            const character = createCharacter(this.npcStats);
            return character;
        });

        return new Team({
            id: "Random Team " + uniqueID(),
            members: teamCharacters,
        });


    }

    async start(game: Game) {

        const RandomNPC = createCharacter(this.npcStats);

        const centralTownPlace = game.getPlace("central_town");
        if (centralTownPlace === undefined) {
            throw new Error("Central Town place not found.");
        }

        centralTownPlace.actions.push({
            id: "fight_random",
            label: "Fight Random Group",
            onSelect: async (game) => {

                const result = await new CombatController(
                    game.menu
                ).battleToTestFlow(
                    game.team,
                    this.createTeam(3),
                    game.screenManager
                )

                console.log("Combat result:", result);

                return true;

            }
        });
    }
}