import type { Character, Item } from '@rpg';

export type PlaceAction =
    | { id: string; label: string; kind: 'message'; message: string; gold?: number; icon?: string }
    | { id: string; label: string; kind: 'shop'; icon?: string }
    | { id: string; label: string; kind: 'rest'; icon?: string }
    | { id: string; label: string; kind: 'fight'; npcId: string; icon?: string }
    | { id: string; label: string; kind: 'fight_group'; icon?: string };

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
    recruitOnDefeat?: boolean;
};

export type ShopEntry = {
    item: Item;
    buyPrice: number;
    sellPrice: number;
};

export type Route =
    | { name: 'place' }
    | { name: 'team' }
    | { name: 'character'; characterId: string }
    | { name: 'inventory' }
    | { name: 'shop' }
    | { name: 'combat'; npcId?: string; placeId: string; group?: boolean }
    | { name: 'npc'; npcId: string; placeId: string };
