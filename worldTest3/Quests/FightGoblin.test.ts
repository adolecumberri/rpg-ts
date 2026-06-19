import { Character, Stats, Team } from "../../src";
import { CombatEngine } from "../../src/classes/Combat/CombatEngine";
import { uniqueID } from "../../src/helpers/common.helpers";
import { CombatController } from "../Combat/CombatController";
import { SKILLS } from "../Combat/SkillsConstants";
import { Game } from "../Game/game";
import { NPC } from "../NPC/npc";
import { createCharacter } from "../Utils/Character.utils";
import { Quest } from "../quests/Quest";

export class FightGoblin implements Quest {
    id = "fight_goblin";




    async start(game: Game) {


        const centralTownPlace = game.getPlace("central_town");
        if (centralTownPlace === undefined) {
            throw new Error("Central Town place not found.");
        }

        centralTownPlace.actions.push({
            id: "fight_goblin",
            label: "Fight Goblin",
            onSelect: async (game) => {

                const goblin = createCharacter({
                    hp: 100,
                    totalHp: 100
                });

                const hero = createCharacter({
                    attack: 10
                });

                new CombatEngine().executeSkill({
                    skill: SKILLS.basicAttack,
                    attacker: hero,
                    allies: new Team(),
                    enemies: new Team(),
                    explicitTargets: [goblin]
                });

                console.log(goblin.stats.hp);

                return true;
            }
        });
    }
}