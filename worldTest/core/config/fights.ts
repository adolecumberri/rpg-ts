// Fixed values of the story fights: reusable battle definitions built
// with the character generator, plus outcome hooks that receive the
// mission that triggered them (on_flee -> mission.fail()).
import type { Character } from '../../../src';
import type { MissionRunner } from '../missions';
import { characterGenerator } from '../generators/characterGenerator';
import { Creatures } from '../constants/creatures';
import { ARCHER_JOB, HEALER_JOB, SOLDIER_JOB } from '../constants/jobs';
import { FLAGS } from '../constants/flags';

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
    // World npc ids that fight as the enemies instead (the camp's own
    // people in the sparring matches): resolved from the session's
    // places when the battle starts. Non-lethal: the session restores
    // their hp after the fight.
    enemyIds?: string[];
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

    // ------------------------------------------------------------------
    // Act 1 · "Training to be worth it": three sparring matches and the
    // captain. The opponents are the camp's own people (a soldier, a
    // mage and an archer of the Order). Losing carries no penalty (the
    // mission advances anyway); each WIN leaves its flag in the story
    // memory. Sparring is non-lethal: the camp fighters recover after
    // the match.
    // ------------------------------------------------------------------
    // ------------------------------------------------------------------
    // Act 1 · the Sparring: the starting squad (the recruit + the two
    // teammates) fights an Order soldier, archer and mage together.
    // Losing carries no penalty; a WIN leaves the class flags in the
    // story memory.
    // ------------------------------------------------------------------
    sparring_squad: {
        id: 'sparring_squad',
        mode: 'turn',
        placeId: 'camp',
        enemies: () => [
            characterGenerator({ job: SOLDIER_JOB, level: 3, id: 'sparring_soldier', name: 'Order Soldier' }),
            characterGenerator({ job: ARCHER_JOB, level: 3, id: 'sparring_archer', name: 'Order Archer' }),
            characterGenerator({ job: HEALER_JOB, level: 3, id: 'sparring_mage', name: 'Order Mage' }),
        ],
        onWin: (mission) => {
            mission?.takeFlag(FLAGS.TRAINING_WON_SOLDIER);
            mission?.takeFlag(FLAGS.TRAINING_WON_ARCHER);
            mission?.takeFlag(FLAGS.TRAINING_WON_MAGE);
        },
    },

    sparring_soldier: {
        id: 'sparring_soldier',
        mode: 'turn',
        placeId: 'camp',
        enemies: () => [
            characterGenerator({ job: SOLDIER_JOB, level: 2, id: 'sparring_soldier', name: 'Order Soldier' }),
        ],
        enemyIds: ['soldier_0'],
        onWin: (mission) => mission?.takeFlag(FLAGS.TRAINING_WON_SOLDIER),
    },
    sparring_mage: {
        id: 'sparring_mage',
        mode: 'turn',
        placeId: 'camp',
        enemies: () => [
            characterGenerator({ job: HEALER_JOB, level: 2, id: 'sparring_mage', name: 'Order Mage' }),
        ],
        enemyIds: ['healer_0'],
        onWin: (mission) => mission?.takeFlag(FLAGS.TRAINING_WON_MAGE),
    },
    sparring_archer: {
        id: 'sparring_archer',
        mode: 'turn',
        placeId: 'camp',
        enemies: () => [
            characterGenerator({ job: ARCHER_JOB, level: 2, id: 'sparring_archer', name: 'Order Archer' }),
        ],
        enemyIds: ['archer_0'],
        onWin: (mission) => mission?.takeFlag(FLAGS.TRAINING_WON_ARCHER),
    },
    sparring_captain: {
        id: 'sparring_captain',
        mode: 'turn',
        placeId: 'camp',
        enemies: () => [
            characterGenerator({ job: SOLDIER_JOB, level: 4, id: 'sparring_captain', name: 'Captain Rodrigo' }),
        ],
        onWin: (mission) => mission?.takeFlag(FLAGS.TRAINING_WON_CAPTAIN),
    },

    // ------------------------------------------------------------------
    // Act 1 · "Caza menor": the east field packs (3 boars, then 4 more
    // with no healing between the hunts) and the spectral boar nobody
    // should fight.
    // ------------------------------------------------------------------
    boar_trio: {
        id: 'boar_trio',
        mode: 'hybrid',
        placeId: 'east_field',
        enemies: () => [
            characterGenerator({ creature: Creatures.boar, level: 1, id: 'boar_a' }),
            characterGenerator({ creature: Creatures.boar, level: 2, id: 'boar_b' }),
            characterGenerator({ creature: Creatures.boar, level: 2, id: 'boar_c' }),
        ],
    },
    boar_four: {
        id: 'boar_four',
        mode: 'hybrid',
        placeId: 'east_field',
        enemies: () => [
            characterGenerator({ creature: Creatures.boar, level: 2, id: 'boar_d' }),
            characterGenerator({ creature: Creatures.boar, level: 2, id: 'boar_e' }),
            characterGenerator({ creature: Creatures.boar, level: 3, id: 'boar_f' }),
            characterGenerator({ creature: Creatures.boar, level: 3, id: 'boar_g' }),
        ],
    },
    spectral_boar: {
        id: 'spectral_boar',
        mode: 'hybrid',
        placeId: 'east_field',
        enemies: () => [
            characterGenerator({ creature: Creatures.spectral_boar, level: 2, id: 'spectral_boar' }),
        ],
        // The hunt is NOT winnable: engaging and losing fails the
        // mission (fleeing is the victory the step waits for).
        onLose: (mission) => mission?.fail(),
    },
};
