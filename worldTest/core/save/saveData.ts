import type { MissionSnapshot } from '../missions/mission';
import type { TeamPosition } from '../../../src';

export const SAVE_VERSION = 1;

export type SavedCharacter = {
    id: string;
    name: string;
    attack: number;
    defence: number;
    hp: number;
    totalHp: number;
    isAlive: number;
    level: number;
    currentXp: number;
    // Battle weariness (optional: saves made before fatigue existed
    // load at 0, the default).
    fatigue?: number;
    // Formation row in the team (optional: saves made before positions
    // existed load at 'front', the default).
    position?: TeamPosition;
    equipment: { slot: string; itemId: string }[];
};

export type SavedSlot = {
    itemId: string;
    // Available (not equipped) copies.
    quantity: number;
    // Owned overall.
    totalQuantity: number;
};

export type SavedNpc = {
    id: string;
    placeId: string;
    hp: number;
    isAlive: number;
};

export type SaveData = {
    version: number;
    currentPlaceId: string;
    gold: number;
    unlocked: string[];
    team: SavedCharacter[];
    // Every owned character with its active-party flag. Optional so
    // saves made before the roster existed still load.
    roster?: (SavedCharacter & { active: boolean })[];
    inventory: SavedSlot[];
    npcs: SavedNpc[];
    // World npc ids permanently removed (defeated recruits...). Optional
    // so saves made before this field existed still load.
    removedNpcs?: string[];
    encounters: { placeId: string; victories: number }[];
    spawnedSpecials: string[];
    skillTrees: { characterId: string; learned: string[] }[];
    // Mission progress (optional: saves made before missions existed
    // still load).
    missions?: MissionSnapshot[];
    // Elapsed story days (optional: saves made before the calendar
    // existed still load, starting at day 0).
    calendarDay?: number;
    // Story flags (optional: saves made before the registry existed
    // still load, rebuilding it from the mission snapshots).
    flags?: string[];
    // Remaining shop stock per shop (optional: saves made before shops
    // existed still load, with every shop opening full).
    shops?: { shopId: string; remaining: string[] }[];
};
