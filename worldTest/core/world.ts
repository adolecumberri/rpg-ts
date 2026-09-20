import { Team } from '../../src';
import type { NPC, Place } from './types';

// ---------------------------------------------------------------------------
// Empty world scaffold. All content (places, npcs, loot, encounters) was
// removed for the deeper RPG rebuild: only the structure remains.
// ---------------------------------------------------------------------------

export const PLACES: Place[] = [
    {
        id: 'central_town',
        name: 'Central Town',
        emoji: '🏰',
        description: 'A blank slate. Content is created from here.',
        actions: [],
        connections: [],
    },
];

export const PLACES_BY_ID: Record<string, Place> = PLACES.reduce((acc: Record<string, Place>, place) => {
    acc[place.id] = place;
    return acc;
}, {});

/**
 * The npcs the current world defines. Empty for now: saves never decide
 * which npcs exist, the world does.
 */
export function createInitialNpcs(): Map<string, NPC[]> {
    return new Map();
}

/**
 * A fresh world: empty party, empty npc list. Content comes later.
 */
export function createInitialWorld(): { team: Team; npcs: Map<string, NPC[]> } {
    return { team: new Team(), npcs: createInitialNpcs() };
}

/**
 * Group battles keep their entry point; groups are defined when content
 * returns.
 */
export function makeGroupTeam(groupId: string = ''): Team {
    return new Team({ id: groupId || 'group', members: [] });
}
