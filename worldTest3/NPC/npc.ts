import { Character } from "../../src";
import { Game } from "../Game/game";


export type NPCInteraction = {
    id: string;
    label: string;


    onSelect: (
        game: Game,
        npc: NPC,
    ) => Promise<void>;
};

export type NPC = {
    id: string;
    character: Character;

    experienceReward?: number;

    onDefeat?: (game: Game, npc: NPC, placeId: string) => Promise<void>;

    interactions: NPCInteraction[];
};

