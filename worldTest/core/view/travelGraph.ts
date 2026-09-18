import type { Place } from '../types';

export type TravelGraphNode = {
    id: string;
    name: string;
    emoji: string;
};

export type TravelGraphEdge = {
    from: string;
    to: string;
    label: string;
    locked: boolean;
};

export type TravelGraph = {
    nodes: TravelGraphNode[];
    edges: TravelGraphEdge[];
};

/**
 * Builds the travel graph from the places schema. Bidirectional
 * connections collapse into a single edge; an edge is locked when any
 * direction requires a flag the session does not have.
 */
export function buildTravelGraph(places: Place[], unlocked: Set<string>): TravelGraph {
    const nodes: TravelGraphNode[] = places.map((place) => ({
        id: place.id,
        name: place.name,
        emoji: place.emoji,
    }));

    const edgeMap = new Map<string, TravelGraphEdge>();
    for (const place of places) {
        for (const connection of place.connections) {
            const key = [place.id, connection.to].sort().join('|');
            const locked = Boolean(connection.requiredFlag && !unlocked.has(connection.requiredFlag));
            const existing = edgeMap.get(key);
            if (existing) {
                existing.locked = existing.locked || locked;
            } else {
                edgeMap.set(key, {
                    from: place.id,
                    to: connection.to,
                    label: connection.label,
                    locked,
                });
            }
        }
    }

    return { nodes, edges: Array.from(edgeMap.values()) };
}
