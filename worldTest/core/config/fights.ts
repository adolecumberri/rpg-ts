// Fixed values of the story fights: reusable battle definitions built
// with the character generator, plus outcome hooks that receive the
// mission that triggered them (on_flee -> mission.fail()).
import type { Character } from '../../../src';
import type { MissionRunner } from '../missions';
import { characterGenerator } from '../generators/characterGenerator';

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
    // Battle 1 of the hay field: the player and two farmers against
    // three goblins.
    hay_goblins: {
        id: 'hay_goblins',
        mode: 'hybrid',
        placeId: 'hay_field',
        enemies: () => [
            characterGenerator('goblin', 1, { id: 'hay_goblin_a' }),
            characterGenerator('goblin', 1, { id: 'hay_goblin_b' }),
            characterGenerator('goblin', 1, { id: 'hay_goblin_c' }),
        ],
        // Arturo and one more farmhand fight automatically.
        allyIds: ['arturo', 'farmer_0'],
        onFlee: (mission) => mission?.fail(),
        onLose: (mission) => mission?.fail(),
    },
    // Battle 2 of the hay field: five farmers and the player against
    // nine goblins.
    hay_goblins_2: {
        id: 'hay_goblins_2',
        mode: 'hybrid',
        placeId: 'hay_field',
        enemies: () =>
            Array.from({ length: 9 }, (_, index) =>
                characterGenerator('goblin', 1, { id: `hay_wave_goblin_${index}` }),
            ),
        allyIds: ['arturo', 'farmer_0', 'farmer_1', 'farmer_2', 'farmer_3'],
        onFlee: (mission) => mission?.fail(),
        onLose: (mission) => mission?.fail(),
    },
    // Battle 3 of the hay field: the player fights as the lord's son
    // against the goblin chief and eight goblins.
    hay_boss: {
        id: 'hay_boss',
        mode: 'hybrid',
        placeId: 'hay_field',
        // The user controls Federico for this fight.
        manualId: 'lord_son',
        enemies: () => [
            characterGenerator('goblin', 1, {
                id: 'hay_boss_goblin',
                name: 'Goblin Chief',
                stats: { hp: 220, attack: 12, defence: 6 },
            }),
            ...Array.from({ length: 8 }, (_, index) =>
                characterGenerator('goblin', 1, { id: `hay_boss_add_${index}` }),
            ),
        ],
        onFlee: (mission) => mission?.fail(),
        onLose: (mission) => mission?.fail(),
    },
    // The dev training dummy: a damage sponge for testing attacks,
    // skills and fatigue. It never fights back and belongs to no story.
    dev_dummy: {
        id: 'dev_dummy',
        mode: 'turn',
        placeId: 'farm',
        enemies: () => [
            characterGenerator('dummy', 1, { id: 'training_dummy' }),
        ],
    },
};
