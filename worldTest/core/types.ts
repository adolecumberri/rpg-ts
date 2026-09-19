import type { Character, Item } from '../../src';
import type { DropTable } from './loot/dropTable';

export type PlaceAction =
    | { id: string; label: string; kind: 'message'; message: string; gold?: number; icon?: string }
    | { id: string; label: string; kind: 'shop'; icon?: string }
    | { id: string; label: string; kind: 'rest'; icon?: string }
    | { id: string; label: string; kind: 'fight'; npcId: string; icon?: string }
    | { id: string; label: string; kind: 'fight_group'; icon?: string; groupId?: string }
    | { id: string; label: string; kind: 'interval'; icon?: string };

export type PlaceConnection = {
    label: string;
    to: string;
    icon?: string;
    requiredFlag?: string;
    lockedMessage?: string;
};

export type Place = {
    id: string;
    name: string;
    description: string;
    emoji: string;
    actions: PlaceAction[];
    connections: PlaceConnection[];
};

export type NPC = {
    id: string;
    character: Character;
    talk: string;
    xpReward: number;
    goldReward: number;
    // Level of the creature (used by the individual XP rules).
    level?: number;
    // When set, the killer receives exactly this XP and nobody else does.
    customXp?: number;
    recruitOnDefeat?: boolean;
    dropTable?: DropTable;
    // When true the npc stays in the place with full hp after being defeated.
    respawns?: boolean;
};

export type ShopEntry = {
    item: Item;
    buyPrice: number;
    sellPrice: number;
};
