import { Character, Stats, Team } from '../../src';
import type { NPC, NPCDefinition, Place } from './types';
import type { Mission } from './missions';
import {
    ACT1,
    buildPlayerFarmer,
    chopWoodMission,
    cowMission,
    hayFieldArrival,
    sicklesMission,
} from './config/act1';
import { DEFAULT_ITEM_TABLE } from './items';
import { farmerNameFor } from './names';

// ---------------------------------------------------------------------------
// Act 1 world content: El Fergel, the lord's farm and the hay field.
// The places own their people as data; live characters are built at load.
// ---------------------------------------------------------------------------

const HOUSEHOLD_NPCS: NPCDefinition[] = ACT1.household.map((member) => ({
    id: member.id,
    name: member.name,
    talk: member.talk,
    // The lord's son is the family's fighter: in the goblin chief
    // battle the player controls him with these stats.
    stats: member.id === 'lord_son'
        ? { hp: 130, totalHp: 130, attack: 28, defence: 10, speed: 6 }
        : { hp: 40, totalHp: 40, attack: 8, defence: 2, speed: 6 },
    group: "The Lord's Household",
    respawns: true,
}));

const FARMER_NPCS: NPCDefinition[] = [
    {
        id: ACT1.farmers.arturoId,
        name: ACT1.farmers.arturoName,
        talk: '"Hey! The lord said to pair up for the chores."',
        stats: ACT1.farmers.stats,
        group: 'The Farmers',
        inRoster: true,
        equipment: ['sickle'],
    },
    ...Array.from({ length: ACT1.farmers.count }, (_, index) => {
        const gender: 'male' | 'female' = index % 2 === 0 ? 'male' : 'female';
        const id = `farmer_${index}`;
        return {
            id,
            name: farmerNameFor(id, gender),
            talk: ACT1.farmers.talk,
            stats: ACT1.farmers.stats,
            group: 'The Farmers',
            inRoster: true,
            equipment: ['sickle'],
        };
    }),
];

export const PLACES: Place[] = [
    {
        id: ACT1.startPlaceId,
        name: "The Lord's Farm",
        emoji: '🌾',
        description: 'A farm in El Fergel, a southern country. You were bought by the lord and work his land.',
        position: { x: 300, y: 260 },
        actions: [
            { id: 'mission_board', label: 'Mission Board (The Hall)', kind: 'mission_board', icon: '📋' },
            { id: 'farm_shop', label: 'Farm Shop', kind: 'shop', shopId: 'farm_shop', icon: '🛒' },
            ...ACT1.tasks.map((task) => ({
                id: task.id,
                label: task.label,
                kind: 'task' as const,
                itemId: task.itemId,
                quantity: task.quantity,
                icon: task.icon,
            })),
        ],
        connections: [
            { label: 'Hay Field', to: 'hay_field', icon: '🌾', requiredMissionId: 'sickles_to_hay' },
        ],
        npcs: [...HOUSEHOLD_NPCS, ...FARMER_NPCS],
    },
    {
        id: 'hay_field',
        name: 'Hay Field',
        emoji: '🌾',
        description: 'Golden fields where the hay grows. Arturo works here.',
        position: { x: 600, y: 260 },
        actions: [],
        connections: [{ label: "The Lord's Farm", to: ACT1.startPlaceId, icon: '🏰' }],
        npcs: [],
        // No menu here: arriving plays the sickles story (thanks, then
        // goblins), the battle decides the mission, and the player goes
        // back to the map.
        menu: false,
        arrival: hayFieldArrival(),
    },
];

export const PLACES_BY_ID: Record<string, Place> = PLACES.reduce((acc: Record<string, Place>, place) => {
    acc[place.id] = place;
    return acc;
}, {});

/**
 * Builds the live npcs of every place from their stored definitions,
 * and collects the characters that join the player's roster.
 */
export function buildNpcsFromPlaces(places: Place[]): {
    npcs: Map<string, NPC[]>;
    rosterCharacters: Character[];
} {
    const npcs = new Map<string, NPC[]>();
    const rosterCharacters: Character[] = [];

    for (const place of places) {
        const list: NPC[] = [];
        for (const def of place.npcs) {
            const character = new Character({
                id: def.id,
                name: def.name,
                stats: new Stats(def.stats),
            });
            // Starting equipment (the farmers wear their sickles).
            for (const itemId of def.equipment ?? []) {
                if (!DEFAULT_ITEM_TABLE.has(itemId)) continue;
                character.equipment.equipOrReplace(DEFAULT_ITEM_TABLE.createItem(itemId), character);
            }
            list.push({
                id: def.id,
                character,
                talk: def.talk,
                xpReward: def.xpReward ?? 0,
                goldReward: def.goldReward ?? 0,
                level: def.level,
                customXp: def.customXp,
                recruitOnDefeat: def.recruitOnDefeat,
                dropTable: def.dropTable,
                respawns: def.respawns,
                group: def.group,
            });
            if (def.inRoster) rosterCharacters.push(character);
        }
        npcs.set(place.id, list);
    }

    return { npcs, rosterCharacters };
}

/**
 * A fresh Act 1 world: the bought farmer as the player (with sack and
 * outfit), the farm people, and the hall missions.
 */
export function createInitialWorld(): {
    team: Team;
    npcs: Map<string, NPC[]>;
    roster: Character[];
} {
    const team = new Team();
    const player = buildPlayerFarmer();
    team.addCharacter(player);
    player.equipment.equipOrReplace(DEFAULT_ITEM_TABLE.createItem('sack'), player);
    player.equipment.equipOrReplace(DEFAULT_ITEM_TABLE.createItem('farmer_outfit'), player);
    team.gold = 10;

    const { npcs, rosterCharacters } = buildNpcsFromPlaces(PLACES);
    return { team, npcs, roster: [player, ...rosterCharacters] };
}

/**
 * The missions of the current world: the hall board offers them in
 * order (chopping wood unlocks after the sickles are delivered, the
 * cow after the wood is chopped). All three live on the farm's board.
 */
export function createInitialMissions(): Mission[] {
    return [sicklesMission(), chopWoodMission(), cowMission()];
}
