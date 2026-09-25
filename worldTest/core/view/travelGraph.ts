import type { Place } from '../types';

export type TravelGraphNode = {
    id: string;
    name: string;
    emoji: string;
    // Content-defined map position (optional: the map falls back to an
    // automatic layout).
    position?: { x: number; y: number };
};

export type TravelGraphEdge = {
    from: string;
    to: string;
    label: string;
    // Locked in the from -> to direction (each direction is gated by
    // its own connection, so the way home stays open).
    lockedFrom: boolean;
    lockedTo: boolean;
};

export type TravelGraph = {
    nodes: TravelGraphNode[];
    edges: TravelGraphEdge[];
};

const connectionLocked = (
    connection: { requiredFlag?: string; requiredMissionId?: string },
    unlocked: Set<string>,
    missionUnlocked: (missionId: string) => boolean,
): boolean =>
    Boolean(connection.requiredFlag && !unlocked.has(connection.requiredFlag))
    || Boolean(connection.requiredMissionId && !missionUnlocked(connection.requiredMissionId));

/**
 * Builds the travel graph from the places schema. Bidirectional
 * connections collapse into a single edge, but each direction keeps
 * its own lock (a gated road out does not gate the way back home).
 */
export function buildTravelGraph(
    places: Place[],
    unlocked: Set<string>,
    missionUnlocked: (missionId: string) => boolean = () => true,
): TravelGraph {
    const nodes: TravelGraphNode[] = places.map((place) => ({
        id: place.id,
        name: place.name,
        emoji: place.emoji,
        position: place.position ? { ...place.position } : undefined,
    }));

    const edgeMap = new Map<string, TravelGraphEdge>();
    for (const place of places) {
        for (const connection of place.connections) {
            const sorted = [place.id, connection.to].sort();
            const key = sorted.join('|');
            const locked = connectionLocked(connection, unlocked, missionUnlocked);
            const existing = edgeMap.get(key);
            if (existing) {
                // The second half of a bidirectional pair fills the
                // reverse direction of the existing edge.
                if (sorted[0] === place.id) existing.lockedFrom = existing.lockedFrom || locked;
                else existing.lockedTo = existing.lockedTo || locked;
            } else {
                edgeMap.set(key, {
                    from: sorted[0],
                    to: sorted[1],
                    label: connection.label,
                    lockedFrom: place.id === sorted[0] ? locked : false,
                    lockedTo: place.id === sorted[1] ? locked : false,
                });
            }
        }
    }

    return { nodes, edges: Array.from(edgeMap.values()) };
}

/**
 * The part of the graph the player actually sees: places reachable from
 * the current place following each edge's own direction locks. Places
 * behind locked routes are disabled (hidden), not drawn with a lock.
 */
export function reachableTravelGraph(graph: TravelGraph, fromId: string): TravelGraph {
    const reachable = new Set<string>([fromId]);
    let changed = true;
    while (changed) {
        changed = false;
        for (const edge of graph.edges) {
            if (!edge.lockedFrom && reachable.has(edge.from) && !reachable.has(edge.to)) {
                reachable.add(edge.to);
                changed = true;
            }
            if (!edge.lockedTo && reachable.has(edge.to) && !reachable.has(edge.from)) {
                reachable.add(edge.from);
                changed = true;
            }
        }
    }

    return {
        nodes: graph.nodes.filter((node) => reachable.has(node.id)),
        edges: graph.edges.filter(
            (edge) => reachable.has(edge.from) && reachable.has(edge.to),
        ),
    };
}
