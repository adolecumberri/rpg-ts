import { Character } from "../../src";
import { uniqueID } from "../../src/helpers/common.helpers";
import { Game } from "../Game/game";
import { NPC } from "../NPC/npc";
import { createCharacter } from "../Utils/Character.utils";
import { Quest } from "../quests/Quest";

export class FightRandomQuest implements Quest {
    id = "fight_random";

    timesDefeated = 0;

    npcStats = {
        attack: 6,
        hp: 5,
        totalHp: 5,
        defence: 0,
    };

    createNPC(character: Character): NPC {
        return {
            id: "Random NPC " + uniqueID(),
            character: character,
            experienceReward: 25 + this.timesDefeated * 10,
            onDefeat: async (game, npc, placeId) => {
                this.timesDefeated += 1;
                console.clear();

                this.npcStats.attack += 1;
                this.npcStats.totalHp += 10;
                this.npcStats.hp = this.npcStats.totalHp;

                game.removeNPC(placeId, npc.id);

                const nextNPC = createCharacter(this.npcStats);

                game.addNPC(
                    placeId,
                    this.createNPC(nextNPC),
                );

                console.log(`${npc.character.name} was defeated.`);
                console.log(`But ${nextNPC.name} appears...`);

            },
            interactions: [{
                id: "fight",
                label: "Fight " + character.name,
                onSelect: async (game, npc) => {
                    console.clear();
                    await game.fightNPC(
                        "central_town",
                        npc.id,
                    );
                    await game.menu.waitForAnyKey("Press any key...");
                },
            }]
        };
    }

    async start(game: Game) {

        const RandomNPC = createCharacter(this.npcStats);

        game.addNPC("central_town", this.createNPC(RandomNPC));
    }
}

