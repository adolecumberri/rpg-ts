import { Game } from "../Game/game";

export type Quest = {
    start: (game: Game) => Promise<void>;
};