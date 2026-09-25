import type { Character, Item } from '../../src';
import type { DropTable } from './loot/dropTable';

// What happens when the player arrives at a place (story events).
export type ArrivalEvent = {
    // Only plays while this mission is active (accepted, not completed).
    missionId: string;
    // The chat (CHATS constant) queued into the global message system.
    chatId: string;
    // The fight (FIGHTS constant) that starts once the chat is read.
    fightId?: string;
};

export type PlaceAction =
    | { id: string; label: string; kind: 'message'; message: string; gold?: number; icon?: string }
    | { id: string; label: string; kind: 'shop'; shopId?: string; icon?: string }
    | { id: string; label: string; kind: 'rest'; icon?: string }
    | { id: string; label: string; kind: 'fight'; npcId: string; icon?: string }
    | { id: string; label: string; kind: 'fight_group'; icon?: string; fightId?: string }
    | { id: string; label: string; kind: 'interval'; icon?: string }
    | { id: string; label: string; kind: 'train'; levels: number; icon?: string }
    | { id: string; label: string; kind: 'task'; itemId: string; quantity: number; icon?: string }
    | { id: string; label: string; kind: 'mission'; missionId: string; icon?: string }
    | { id: string; label: string; kind: 'mission_board'; icon?: string };

export type PlaceConnection = {
    label: string;
    to: string;
    icon?: string;
    requiredFlag?: string;
    // The connection is locked until this mission is active (or
    // completed): places only open when the story allows them.
    requiredMissionId?: string;
    lockedMessage?: string;
};

export type Place = {
    id: string;
    name: string;
    description: string;
    emoji: string;
    actions: PlaceAction[];
    connections: PlaceConnection[];
    // The place's people, as data: live characters are built from these
    // at load and the save re-applies their state.
    npcs: NPCDefinition[];
    // Optional map position (content decides the layout). Places without
    // one get an automatic circular layout on the map.
    position?: { x: number; y: number };
    // When false the place has no menu: arriving plays its arrival
    // events (messages, battles) and the player goes back to the map.
    menu?: boolean;
    // Story events that fire when the player arrives here.
    arrival?: ArrivalEvent;
};

export type NPCStats = {
    hp: number;
    totalHp: number;
    attack: number;
    defence: number;
    magicDefence?: number;
    speed?: number;
};

// The data a place stores about one of its people. Live characters are
// built from these at world load, and the save re-applies their state.
export type NPCDefinition = {
    id: string;
    name: string;
    talk: string;
    stats: NPCStats;
    // Presentation group, e.g. "The Lord's Household" / "The Farmers".
    group?: string;
    // Item ids the character wears from the start (farmers carry sickles).
    equipment?: string[];
    xpReward?: number;
    goldReward?: number;
    // Level of the creature (used by the individual XP rules).
    level?: number;
    // When set, the killer receives exactly this XP and nobody else does.
    customXp?: number;
    recruitOnDefeat?: boolean;
    dropTable?: DropTable;
    // When true the npc stays in the place with full hp after being defeated.
    respawns?: boolean;
    // When true the character joins the player's roster at world start.
    inRoster?: boolean;
};

// A live npc instance in the session (built from an NPCDefinition).
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
    // Presentation group, e.g. "The Lord's Household" / "The Farmers".
    group?: string;
};

export type ShopEntry = {
    item: Item;
    buyPrice: number;
    sellPrice: number;
};
