import { Quest } from "./Quest";
import { Game } from "../Game/game";
import { Character, Stats } from "../../src";
import { createCharacter } from "../Utils/Character.utils";



export class StarterQuest implements Quest {
    northResident = {
        characterId: "default",
        townId: "north_town",
    };

    southResident = {
        characterId: "default",
        townId: "south_town",
    };

    defeated = new Set<string>();

    registerDefeat(characterId: string, game: Game) {
        this.defeated.add(characterId);

        if (this.isCompleted()) {
            void this.onComplete(game);
        }
    }

    isCompleted(): boolean {
        return (
            this.defeated.has(this.northResident.characterId)
            && this.defeated.has(this.southResident.characterId)
        );
    }

    onComplete(game: Game) {

        game.enqueueUI(async () => {
            console.clear();
            console.log("Congratulations! You have completed the Starter Quest.");
            console.log("You have recruited both residents to your team.");
            console.log("The east city got unlocked");
            await game.menu.waitForAnyKey("Press any key...");
        });


        game.addPlace({
            id: "east_town",
            name: "East Town",
            description: "A mysterious town to the east.",
            connections: [
                { label: "Return to Central", to: "central_town" },
            ],
        });

        game.addConnectionToPlace("central_town", "east_town", "Go East");
    }

    async start(game: Game) {

        // 1. create candidates
        const candidates = [
            createCharacter(),
            createCharacter(),
            createCharacter(),
        ];

        // 2. let player choose
        const index = await game.menu.selectMenuOption(
            "CHOOSE YOUR CHARACTER",
            candidates.map((c) => ({
                label: `${c.name} | ATK ${c.stats.attack} | DEF ${c.stats.defence} | HP ${c.stats.hp}/${c.stats.totalHp}`,
                execute: async () => true,
            }))
        );

        const selected = candidates[index];
        game.team.addCharacter(selected);

        const remaining = candidates.filter((_, i) => i !== index);

        this.northResident.characterId = remaining[0].id;
        this.southResident.characterId = remaining[1].id;

        game.addNPC("north_town", {
            id: remaining[0].id,
            character: remaining[0],
            onDefeat: async (game, npc, placeId) => {
                //recruit to team

                npc.character.stats.hp = 1; // make it look like they survived with 1 hp
                game.recruitNPC(npc, placeId);
                this.registerDefeat(npc.id, game);
            },
            interactions: [
                {
                    id: "talk",
                    label: "Talk",
                    onSelect: async (game, npc) => {
                        console.clear();
                        console.log(`${npc.character.name}: I don't trust strangers.`);
                        await game.menu.waitForAnyKey("Press any key...");
                    },
                },
                {
                    id: "fight",
                    label: "Fight",
                    onSelect: async (game, npc) => {
                        console.clear();
                        await game.fightNPC(
                            "north_town",
                            npc.id,
                        );
                        await game.menu.waitForAnyKey("Press any key...");
                        // later: hook combat system here
                    },
                },
            ],
        });

        game.addNPC("south_town", {
            id: remaining[1].id,
            character: remaining[1],
            onDefeat: async (game, npc, placeId) => {
                //recruit to team
                npc.character.stats.hp = 1; // make it look like they survived with 1 hp
                game.recruitNPC(npc, placeId);
                this.registerDefeat(npc.id, game);
            },
            interactions: [
                {
                    id: "talk",
                    label: "Talk",
                    onSelect: async (game, npc) => {
                        console.clear();
                        console.log(`${npc.character.name}: The south is peaceful... for now.`);
                        await game.menu.waitForAnyKey("Press any key...");
                    },
                },
                {
                    id: "fight",
                    label: "Fight",
                    onSelect: async (game, npc) => {
                        console.clear();
                        await game.fightNPC(
                            "south_town",
                            npc.id,
                        );
                        await game.menu.waitForAnyKey("Press any key...");
                    },
                },
            ],
        });

        // 5. show result
        await game.enqueueUI(async () => {
            console.clear();
            console.log(`You selected ${selected.name}`);
            console.log(`${remaining[0].name} goes North`);
            console.log(`${remaining[1].name} goes South`);
            await game.menu.waitForAnyKey("Press any key...");
        });
    }
}