import { Game } from "../Game/Game";

export type Quest = {
    start: (game: Game) => Promise<void>;
};