import { Character, Stats, Team } from '../../src';
import type { NPC, NPCDefinition, Place } from './types';
import type { Mission } from './missions';
import {
    ACT1,
    buildPlayerFarmer,
    chopWoodMission,
    cowMission,
    farmerBossMission,
    hayFieldArrival,
    renegadeArrival,
    renegadeLeagueMission,
    sicklesMission,
} from './config/act1';
import { DEFAULT_ITEM_TABLE } from './items';
import { farmerNameFor } from './names';
import { applyJobBonuses, jobOfCharacter } from './constants/jobs';
import { equipInto, migrateLegacyEquipment } from './equipment/loadout';

// The test bag: two copies of every equipment section, seeded into a
// fresh world and migrated into saves made before it existed.
export const TEST_BAG_ITEMS = [
    'sword',
    'bow',
    'staff',
    'farmer_outfit',
    'helmet',
    'necklace',
    'shield',
];

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

// The Order Army recruits: the twelve farmers were recruited and now
// serve as 4 archers, 2 healers (Arturo among them) and 6 soldiers.
// They live in the camp and are the player's roster. Each class wears
// its weapon.
const RECRUIT_NPCS: NPCDefinition[] = [
    {
        id: ACT1.farmers.arturoId,
        name: ACT1.farmers.arturoName,
        talk: '"The Order needs steady hands."',
        stats: ACT1.recruits.healer,
        group: 'The Order',
        inRoster: true,
        equipment: ['staff'],
    },
    ...Array.from({ length: 4 }, (_, index) => {
        const id = `archer_${index}`;
        return {
            id,
            name: farmerNameFor(id, index % 2 === 0 ? 'male' : 'female'),
            talk: '"My bow is ready."',
            stats: ACT1.recruits.archer,
            group: 'The Order',
            inRoster: true,
            equipment: ['bow'],
        };
    }),
    {
        id: 'healer_0',
        name: farmerNameFor('healer_0', 'female'),
        talk: '"Hold still, I will patch you up."',
        stats: ACT1.recruits.healer,
        group: 'The Order',
        inRoster: true,
        equipment: ['staff'],
    },
    ...Array.from({ length: 6 }, (_, index) => {
        const id = `soldier_${index}`;
        return {
            id,
            name: farmerNameFor(id, index % 2 === 0 ? 'male' : 'female'),
            talk: '"For the Order!"',
            stats: ACT1.recruits.soldier,
            group: 'The Order',
            inRoster: true,
            equipment: ['sword'],
        };
    }),
];

// The camp's commanding officer: gives the missions and forms the squad.
const GENERAL_NPC: NPCDefinition = {
    id: 'general',
    name: 'General Roderick',
    talk: '"The renegade league blames the lord for their lost lands. Deal with them."',
    stats: { hp: 60, totalHp: 60, attack: 10, defence: 4, speed: 6 },
    group: 'The Command',
    respawns: true,
};

// The renegade farmers league: four farmers still loyal to their old
// lands, armed with sickles and holding the lord's farm.
const RENEGADE_NPCS: NPCDefinition[] = Array.from({ length: 4 }, (_, index) => {
    const id = `renegade_${index}`;
    return {
        id,
        name: farmerNameFor(id, index % 2 === 0 ? 'male' : 'female'),
        talk: '"These lands are ours!"',
        stats: ACT1.farmers.stats,
        group: 'The Renegade League',
        equipment: ['sickle'],
    };
});

export const PLACES: Place[] = [
    {
        id: 'camp',
        name: 'Order Camp',
        emoji: '🏕️',
        description: 'The Order Army camp: you were recruited here with eleven other farmers.',
        regionId: 'fergel_este',
        position: { x: 120, y: 260 },
        actions: [
            { id: 'squad', label: 'Form the Squad', kind: 'team', icon: '' },
            { id: 'camp_board', label: "The General's Orders", kind: 'mission_board', icon: '' },
            { id: 'camp_fountain', label: 'Fountain', kind: 'fountain', icon: '' },
            { id: 'camp_look', label: 'Look around', kind: 'look_around', icon: '' },
        ],
        connections: [{ label: "The Lord's Farm", to: ACT1.startPlaceId, icon: '' }],
        npcs: [GENERAL_NPC, ...RECRUIT_NPCS],
    },
    {
        id: ACT1.startPlaceId,
        name: "The Lord's Farm",
        emoji: '',
        subtitle: 'Barony Domain',
        description: 'A farm in El Fergel, a southern country. You were bought by the lord and work his land.',
        regionId: 'fergel_este',
        position: { x: 300, y: 260 },
        actions: [
            { id: 'mission_board', label: 'Mission Board', kind: 'mission_board', icon: '' },
            { id: 'farm_shop', label: 'Farm Shop', kind: 'shop', shopId: 'farm_shop', icon: '' },
            { id: 'farm_look', label: 'Look around', kind: 'look_around', icon: '' },
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
            { label: 'Order Camp', to: 'camp', icon: '🏕️' },
        ],
        npcs: [...HOUSEHOLD_NPCS, ...RENEGADE_NPCS],
        // Arriving while the renegade mission waits for the battle
        // plays the ambush chat and starts the fight.
        arrival: renegadeArrival(),
    },
    {
        id: 'hay_field',
        name: 'Hay Field',
        emoji: '',
        description: 'Golden fields where the hay grows. Arturo works here.',
        regionId: 'fergel_este',
        // The place itself opens only while the sickles mission runs
        // (the road lock is the map view's mirror of this gate).
        lockedByMission: 'sickles_to_hay',
        lockedMessage: 'The hay field is closed until the mission.',
        position: { x: 600, y: 260 },
        actions: [{ id: 'hay_look', label: 'Look around', kind: 'look_around', icon: '🔍' }],
        connections: [{ label: "The Lord's Farm", to: ACT1.startPlaceId, icon: '' }],
        npcs: [],
        // No menu here: arriving plays the sickles story (thanks, then
        // goblins), the battle decides the mission, and the player goes
        // back to the map.
        menu: false,
        arrival: hayFieldArrival(),
    },
    // ------------------------------------------------------------------
    // The rest of Fergel Este: general locations of the region. Open
    // places need no road (same-region travel is free); the east field
    // is a locked place and the faro a hidden one (discovered by the
    // sickles flag). The faro is the future border crossing to Islas.
    // ------------------------------------------------------------------
    {
        id: 'fergel_north_settlement',
        name: 'North Settlement',
        emoji: '🏘️',
        description: 'The northern settlement of El Fergel.',
        regionId: 'fergel_este',
        actions: [{ id: 'ns_look', label: 'Look around', kind: 'look_around', icon: '🔍' }],
        connections: [],
        npcs: [],
    },
    {
        id: 'playa_sur',
        name: 'Playa Sur',
        emoji: '🏖️',
        description: 'The southern beach of the region.',
        regionId: 'fergel_este',
        actions: [{ id: 'playa_look', label: 'Look around', kind: 'look_around', icon: '🔍' }],
        connections: [],
        npcs: [],
    },
    {
        id: 'east_field',
        name: 'East Field',
        emoji: '🌾',
        description: 'The eastern fields, closed while the farm suffers.',
        regionId: 'fergel_este',
        // The combat end already flips this flag ("the east road is
        // now open"): a locked place, visible but closed until then.
        lockedByFlag: 'east_unlocked',
        lockedMessage: 'The east road opens when the villages unite.',
        actions: [{ id: 'east_look', label: 'Look around', kind: 'look_around', icon: '🔍' }],
        connections: [],
        npcs: [],
    },
    {
        id: 'fergel_faro',
        name: 'Faro',
        emoji: '🗼',
        description: 'The lighthouse on the region border. Ships leave from here.',
        regionId: 'fergel_este',
        // A hidden place: not drawn on the map until the east road
        // opens. The future border crossing to the islands.
        hiddenUntilFlag: 'east_unlocked',
        actions: [{ id: 'faro_look', label: 'Look around', kind: 'look_around', icon: '🔍' }],
        connections: [],
        npcs: [],
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
            // The default job: its stat bonuses are applied straight to
            // the stats (plain numbers, no statuses).
            const defaultJob = jobOfCharacter(def.id);
            if (defaultJob) {
                character.jobId = defaultJob.id;
                applyJobBonuses(character, defaultJob);
            }
            // Starting equipment (the farmers wear their sickles).
            for (const itemId of def.equipment ?? []) {
                if (!DEFAULT_ITEM_TABLE.has(itemId)) continue;
                character.equipment.equipOrReplace(DEFAULT_ITEM_TABLE.createItem(itemId), character);
            }
            // The new UI shows the five-hole loadout: move any gear the
            // loadout supports out of the legacy manager so roster
            // members display it (the sickles stay legacy).
            migrateLegacyEquipment(character);
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
 * A fresh Act 1 world: the player as an Order soldier (job bonuses,
 * sword, sack and outfit), the farm people, and the missions.
 */
export function createInitialWorld(): {
    team: Team;
    npcs: Map<string, NPC[]>;
    roster: Character[];
} {
    const team = new Team();
    const player = buildPlayerFarmer();
    team.addCharacter(player);
    // The player enlisted as a soldier: the job and its stat bonuses.
    const defaultJob = jobOfCharacter(player.id);
    if (defaultJob) {
        player.jobId = defaultJob.id;
        applyJobBonuses(player, defaultJob);
    }
    player.equipment.equipOrReplace(DEFAULT_ITEM_TABLE.createItem('sack'), player);
    // The player's starting loadout: the soldier sword and the farmer
    // outfit. Their copies are counted as equipped from the seeded bag.
    for (const itemId of TEST_BAG_ITEMS) {
        team.inventory.addItem(DEFAULT_ITEM_TABLE.createItem(itemId), 2);
    }
    equipInto(player, 0, DEFAULT_ITEM_TABLE.createItem('sword'));
    equipInto(player, 1, DEFAULT_ITEM_TABLE.createItem('farmer_outfit'));
    team.inventory.consumeAvailable('sword', 1);
    team.inventory.consumeAvailable('farmer_outfit', 1);
    team.gold = 10;

    const { npcs, rosterCharacters } = buildNpcsFromPlaces(PLACES);
    return { team, npcs, roster: [player, ...rosterCharacters] };
}

/**
 * The missions of the current world: the camp board offers the renegade
 * league orders; the hall board keeps its parked chain (sickles, wood,
 * cow).
 */
export function createInitialMissions(): Mission[] {
    return [sicklesMission(), chopWoodMission(), cowMission(), renegadeLeagueMission(), farmerBossMission()];
}
