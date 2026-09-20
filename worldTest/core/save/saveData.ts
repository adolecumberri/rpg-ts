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
    inventory: SavedSlot[];
    npcs: SavedNpc[];
    // World npc ids permanently removed (defeated recruits...). Optional
    // so saves made before this field existed still load.
    removedNpcs?: string[];
    encounters: { placeId: string; victories: number }[];
    spawnedSpecials: string[];
    skillTrees: { characterId: string; learned: string[] }[];
};
