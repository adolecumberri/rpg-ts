import { Character, Stats, Team } from '../../src';
import type { NPC, NPCDefinition, NPCStats, Place } from './types';
import type { Mission } from './missions';
import type { Job } from './jobs';
import { ACT1 } from './config/act1';
import { DEFAULT_ITEM_TABLE } from './items';
import { FLAGS } from './constants/flags';
import { Missions } from './constants/missions';
import { farmerNameFor } from './names';
import { applyJobBonuses, jobOfCharacter } from './constants/jobs';
import { characterGenerator } from './generators/characterGenerator';
import { equipInto, migrateLegacyEquipment } from './equipment/loadout';



// The Order Army recruits: the fourteen farmers were recruited and now
// serve with a CONSTANT class composition (ACT1.roster: 4 archers, 2
// healers — Arturo among them — and 8 soldiers). They live in the camp
// and are the player's roster. Each class wears its weapon; its stats
// come from the job's growth bases.
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
    // The healers: Arturo leads them, the rest follow his count.
    {
        id: 'arturo',
        name: 'Arturo',
        talk: '"The Order needs steady hands."',
        stats: recruitStats(ACT1.recruits.healer),
        group: 'The Order',
        inRoster: true,
        equipment: ['staff'],
    },
    ...Array.from({ length: ACT1.roster.healers - 1 }, (_, index) => {
        const id = `healer_${index}`;
        return {
            id,
            name: farmerNameFor(id, 'female'),
            talk: '"Hold still, I will patch you up."',
            stats: recruitStats(ACT1.recruits.healer),
            group: 'The Order',
            inRoster: true,
            equipment: ['staff'],
        };
    }),
    ...Array.from({ length: ACT1.roster.archers }, (_, index) => {
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
    ...Array.from({ length: ACT1.roster.soldiers }, (_, index) => {
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

// The camp's commanding officer: gives the missions and forms the
// squad. He is part of the roster — the captain the recruit spars
// against in the training's final match.
const GENERAL_NPC: NPCDefinition = {
    id: 'general',
    name: 'Captain Rodrigo',
    talk: '"Report to the board for your orders."',
    stats: { hp: 100, totalHp: 100, attack: 12, defence: 6, speed: 6 },
    group: 'The Command',
    portrait: 'captain',
    inRoster: true,
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
            { id: 'camp_board', label: "The General's Orders", kind: 'mission_board', icon: '' },
            {
                id: 'camp_training',
                label: 'Start the training match',
                kind: 'mission_battle',
                missionId: 'training',
                icon: '⚔️',
            },
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
        actions: [],
        connections: [
            { label: 'Hay Field', to: 'hay_field', icon: '🌾' },
            { label: 'Order Camp', to: 'camp', icon: '🏕️' },
        ],
        npcs: [],
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
        // The training's reward opens it: a locked place, visible but
        // closed until then.
        lockedByFlag: FLAGS.EAST_FIELD_UNLOCKED,
        actions: [{ id: 'east_look', label: 'Look around', kind: 'look_around', icon: '🔍' }],
        connections: [],
        npcs: [],
        // The caza menor's first pack charges the squad on arrival.
        arrival: { missionId: 'caza_menor', chatId: 'caza_arrival', fightId: 'boar_trio' },
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
 * A fresh Act 1 world: the recruit (generated with the soldier job at
 * level 5 — the branch choice may re-job them), a sack and the outfit,
 * no weapon and no items; the camp people and the missions.
 */
export function createInitialWorld(): {
    team: Team;
    npcs: Map<string, NPC[]>;
    roster: Character[];
} {
    const team = new Team();
    // The player is a standard generated character: the soldier job at
    // level 5 (job bonuses, growth profile and the level-up wiring all
    // come from the generator).
    const player = characterGenerator({
        job: ACT1.recruits.soldier,
        level: 5,
        id: 'player',
        name: 'Player',
    });
    team.addCharacter(player);
    player.equipment.equipOrReplace(DEFAULT_ITEM_TABLE.createItem('sack'), player);
    // The player's starting loadout: just the farmer outfit in the
    // second hole. No weapon and no items — the branch choice grants
    // the class weapon and the bag starts empty.
    equipInto(player, 1, DEFAULT_ITEM_TABLE.createItem('farmer_outfit'));
    team.gold = 10;

    const { npcs, rosterCharacters } = buildNpcsFromPlaces(PLACES);
    return { team, npcs, roster: [player, ...rosterCharacters] };
}

/**
 * The missions of the current world: the global mission dictionary
 * (constants/missions.ts) — the single source of truth. The act-1
 * story missions are offered on the camp board.
 */
export function createInitialMissions(): Mission[] {
    return Object.values(Missions);
}
