import type { MissionSnapshot } from '../missions/mission';
import type { TeamPosition } from '../../../src';
import type { FaintedEntry } from '../fainting';
import type { StorySnapshot } from '../story';

export const SAVE_VERSION = 2;

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
    // The Job the character holds (optional: saves made before jobs
    // existed load with the default job derived from the id, and its
    // stat bonuses are applied once as a self-heal).
    jobId?: string;
    // The jobs the character has held, in learning order (optional:
    // saves made before the second skill slot load with only the held
    // job remembered).
    heldJobs?: string[];
    // The job feeding the second skill slot (optional: empty slot).
    secondaryJobId?: string;
    // The two passive slots (optional: empty).
    passiveSlots?: Array<string | null>;
    // The picture override (optional: characters without one follow
    // the held job's portrait).
    portraitId?: string;
    // The worldTest-only stats the historic fields don't cover
    // (optional: old saves load at the seeded defaults).
    extraStats?: {
        speed?: number;
        magic?: number;
        magicDefence?: number;
        critChance?: number;
        critMultiplier?: number;
        mana?: number;
        totalMana?: number;
    };
    equipment: { slot: string; itemId: string }[];
    // The five-hole loadout (optional: saves made before the loadout
    // existed keep their legacy equipment and load with empty holes).
    // The hole is 0-based; entries without it (very old saves, named
    // slots) fill the first free hole on load.
    loadout?: { hole?: number; itemId: string }[];
    // Job progression: one bucket per job (optional: saves made before
    // the job system existed load with fresh buckets).
    jobProgress?: Array<{
        jobId: string;
        xp: number;
        // The level of each job skill (base id -> 1..3). v2 replaced the
        // old repeated-ids `enhancements` array.
        skillLevels: Record<string, number>;
        mastered: boolean;
        pendingPicks: number;
    }>;
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
    // What the npc became between fights (optional: old saves load
    // with the content-defined values).
    level?: number;
    currentXp?: number;
    stats?: {
        attack?: number;
        defence?: number;
        magicDefence?: number;
        speed?: number;
        magic?: number;
        critChance?: number;
        critMultiplier?: number;
    };
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
    // The skills the player has seen a party member learn (the job page
    // reveals skill names from this memory; combat ignores it). Optional:
    // saves made before it existed backfill from the party on load.
    knownSkills?: string[];
    // Mission progress (optional: saves made before missions existed
    // still load).
    missions?: MissionSnapshot[];
    // The board-side mission state (the accept/complete counters;
    // optional: saves made before it existed rebuild it lazily on the
    // next board query).
    missionBoard?: {
        missionId: string;
        timesAccepted: number;
        timesCompleted: number;
    }[];
    // Elapsed story days (optional: saves made before the calendar
    // existed still load, starting at day 0).
    calendarDay?: number;
    // Story flags (optional: saves made before the registry existed
    // still load, rebuilding it from the mission snapshots).
    flags?: string[];
    // Places the story events hid (optional: saves made before the
    // story system existed load with none hidden).
    storyHiddenPlaces?: string[];
    // The story engine state: armed acts, completed acts and applied
    // events (optional: saves made before it existed load with every
    // event still pending).
    story?: StorySnapshot;
    // Remaining shop stock per shop (optional: saves made before shops
    // existed still load, with every shop opening full).
    shops?: { shopId: string; remaining: string[] }[];
    // Fallen characters waiting to be revived (optional: saves made
    // before fainting existed load with nobody fallen).
    fainted?: FaintedEntry[];
    // Characters whose corpse waited too long: dead for good.
    deceased?: string[];
};
