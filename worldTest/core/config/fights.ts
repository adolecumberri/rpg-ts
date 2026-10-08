// Fixed values of the story fights: reusable battle definitions built
// with the character generator, plus outcome hooks that receive the
// mission that triggered them (on_flee -> mission.fail()).
import type { Character } from '../../../src';
import type { MissionRunner } from '../missions';
import { characterGenerator } from '../generators/characterGenerator';
import { Creatures } from '../constants/creatures';

export type FightDefinition = {
    id: string;
    // Which combat flow renders the fight. 'turn' is the classic
    // pick-and-resolve battle; 'hybrid' runs automatic fighters on the
    // tick engine while the player still picks their own actions
    // (defaults to 'turn').
    mode?: 'turn' | 'hybrid';
    // The place the battle happens in (used by dev replays and the
    // battle-end bookkeeping).
    placeId?: string;
    // Enemies, generated when the battle starts.
    enemies: () => Character[];
    // Extra generated allies beyond the player's team (throwaways: they
    // fight once and their stats are not persisted).
    allies?: () => Character[];
    // Roster characters that join the battle automatically. Unlike the
    // generated allies they are the real owned characters, so the hp and
    // XP they earn in the battle are persisted with the save.
    allyIds?: string[];
    // When set, the player controls this character instead of their own
    // party (resolved from the team, then the roster, then the world
    // npcs). The player's party members stay out of the battle.
    manualId?: string;
    // Outcome hooks: the mission that triggered the fight is passed in
    // (undefined when the fight had no mission).
    onWin?: (mission: MissionRunner | undefined) => void;
    onFlee?: (mission: MissionRunner | undefined) => void;
    onLose?: (mission: MissionRunner | undefined) => void;
};

export const FIGHTS: Record<string, FightDefinition> = {
    // The dev training dummy: a damage sponge for testing attacks,
    // skills and fatigue. It never fights back and belongs to no story.
    dev_dummy: {
        id: 'dev_dummy',
        mode: 'turn',
        placeId: 'farm',
        enemies: () => [
            characterGenerator({ creature: Creatures.dummy, level: 1, id: 'training_dummy' }),
        ],
    },
};
