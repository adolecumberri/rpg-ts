import { Character, Stats, Team } from '../../src';
import type { NPC, NPCDefinition, NPCStats, Place } from './types';
import type { Mission } from './missions';
import type { Job } from './jobs';
import {
    ACT1,
    buildPlayerFarmer,
} from './config/act1';
import { DEFAULT_ITEM_TABLE } from './items';
import { FLAGS } from './constants/flags';
import { Missions } from './constants/missions';
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
// its weapon; its stats come from the job's growth bases.
const recruitStats = (job: Job): NPCStats => {
    const base = job.growth?.base ?? {};
    return {
        hp: base.hp ?? 20,
        totalHp: base.totalHp ?? 20,
        attack: base.attack ?? 5,
        defence: base.defence ?? 1,
        magicDefence: base.magicDefence,
        speed: base.speed ?? 6,
    };
};

const RECRUIT_NPCS: NPCDefinition[] = [
    {
        id: ACT1.farmers.arturoId,
        name: ACT1.farmers.arturoName,
        talk: '"The Order needs steady hands."',
        stats: recruitStats(ACT1.recruits.healer),
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
            stats: recruitStats(ACT1.recruits.archer),
            group: 'The Order',
            inRoster: true,
            equipment: ['bow'],
        };
    }),
    {
        id: 'healer_0',
        name: farmerNameFor('healer_0', 'female'),
        talk: '"Hold still, I will patch you up."',
        stats: recruitStats(ACT1.recruits.healer),
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
            stats: recruitStats(ACT1.recruits.soldier),
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
    talk: '"Report to the board for your orders."',
    stats: { hp: 60, totalHp: 60, attack: 10, defence: 4, speed: 6 },
    group: 'The Command',
    respawns: true,
};

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
        connections: [{ label: "The Lord's Farm", to: 'farm', icon: '' }],
        npcs: [GENERAL_NPC, ...RECRUIT_NPCS],
    },
    {
        id: 'farm',
        name: "The Lord's Farm",
        emoji: '',
        subtitle: 'Barony Domain',
        description: 'A farm in El Fergel, a southern country. You were bought by the lord and work his land.',
        regionId: 'fergel_este',
        position: { x: 300, y: 260 },
        // Locked by default: its own flag opens it (the story's).
        lockedByFlag: FLAGS.FARM_UNLOCKED,
        actions: [
            { id: 'mission_board', label: 'Mission Board', kind: 'mission_board', icon: '' },
            { id: 'farm_shop', label: 'Farm Shop', kind: 'shop', shopId: 'farm_shop', icon: '' },
            { id: 'farm_look', label: 'Look around', kind: 'look_around', icon: '' },
        ],
        connections: [
            { label: 'Hay Field', to: 'hay_field', icon: '🌾' },
            { label: 'Order Camp', to: 'camp', icon: '🏕️' },
        ],
        npcs: [...HOUSEHOLD_NPCS],
    },
    {
        id: 'hay_field',
        name: 'Hay Field',
        emoji: '',
        description: 'Golden fields where the hay grows. Arturo works here.',
        regionId: 'fergel_este',
        position: { x: 600, y: 260 },
        // Locked by default: its own flag opens it.
        lockedByFlag: FLAGS.HAY_FIELD_UNLOCKED,
        actions: [{ id: 'hay_look', label: 'Look around', kind: 'look_around', icon: '🔍' }],
        connections: [{ label: "The Lord's Farm", to: 'farm', icon: '' }],
        npcs: [],
        menu: false,
    },
    // ------------------------------------------------------------------
    // The rest of Fergel Este: general locations of the region. Each
    // place carries its OWN unlock flag (the story opens them one by
    // one); the faro is the future border crossing to Islas.
    // ------------------------------------------------------------------
    {
        id: 'fergel_north_settlement',
        name: 'North Settlement',
        emoji: '🏘️',
        description: 'The northern settlement of El Fergel.',
        regionId: 'fergel_este',
        lockedByFlag: FLAGS.NORTH_SETTLEMENT_UNLOCKED,
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
        // Locked by default: its own flag opens it.
        lockedByFlag: FLAGS.SOUTH_BEACH_UNLOCKED,
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
        lockedByFlag: FLAGS.EAST_FIELD_UNLOCKED,
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
        // A locked place: visible on the map but closed until its own
        // flag opens it. The future border crossing to the islands.
        lockedByFlag: FLAGS.FARO_UNLOCKED,
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
            // The picture override: stamped once at world build, never
            // re-derived from the job.
            if (def.portrait) {
                character.portraitId = def.portrait;
            }
            // Starting equipment (the recruits wear their class weapons).
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
 * The missions of the current world: the global mission dictionary
 * (constants/missions.ts) — the single source of truth. The boards
 * offer the seasonal encargos and the free test mission.
 */
export function createInitialMissions(): Mission[] {
    return Object.values(Missions);
}
