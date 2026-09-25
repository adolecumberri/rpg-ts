import { useGame } from '../game/GameContext';
import { PLACES, PLACES_BY_ID, buildTravelGraph, reachableTravelGraph } from '@core';

// The map viewBox.
const MAP_CENTER = { x: 450, y: 260 };
const MAP_RADIUS = 180;

export function MapScreen() {
    const api = useGame();
    const graph = reachableTravelGraph(
        buildTravelGraph(
            PLACES,
            api.session.unlocked,
            (missionId) => api.session.missionIsActive(missionId),
        ),
        api.session.currentPlaceId,
    );

    // Positions come from the place data; places without one fall back
    // to an automatic circular layout so nothing ever stacks at 0,0.
    const positionOf = (nodeId: string): { x: number; y: number } => {
        const node = graph.nodes.find((entry) => entry.id === nodeId);
        if (node?.position) return node.position;

        const index = graph.nodes.findIndex((entry) => entry.id === nodeId);
        const count = Math.max(1, graph.nodes.length);
        const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
        return {
            x: MAP_CENTER.x + Math.cos(angle) * MAP_RADIUS,
            y: MAP_CENTER.y + Math.sin(angle) * MAP_RADIUS,
        };
    };

    const goTo = (placeId: string) => {
        if (placeId === api.session.currentPlaceId) {
            // Already there: just open the place's menu.
            api.openPlace();
            return;
        }
        const result = api.session.travel(placeId);
        if (result.ok) {
            api.refresh();
            if (result.message) api.showToast(result.message);
            const place = PLACES_BY_ID[placeId];
            if (place && place.menu === false) {
                // Story place: no menu. Messages play over the map and
                // the queued battle starts when they are read. When the
                // arrival fired nothing (mission done), just report it.
                if (!result.arrival) {
                    api.showToast('There is nothing to do here.');
                }
                return;
            }
            // Land on the destination's place screen, no matter where
            // the map was opened from.
            api.openPlace();
        } else {
            api.showToast(result.message ?? 'You cannot travel there.');
        }
    };

    return (
        <div className="screen">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <svg viewBox="0 0 900 520" style={{ width: '100%', height: 'auto' }}>
                    {graph.edges.map((edge) => {
                        const a = positionOf(edge.from);
                        const b = positionOf(edge.to);
                        return (
                            <line
                                key={`${edge.from}|${edge.to}`}
                                x1={a.x}
                                y1={a.y}
                                x2={b.x}
                                y2={b.y}
                                stroke="#7f8cff"
                                strokeWidth={3}
                            />
                        );
                    })}
                    {graph.nodes.map((node) => {
                        const pos = positionOf(node.id);
                        const isCurrent = node.id === api.session.currentPlaceId;
                        const hasMission = api.session.activeMissionsAt(node.id).length > 0
                            || api.session.markersAt(node.id).length > 0;
                        return (
                            <g key={node.id} onClick={() => goTo(node.id)} style={{ cursor: 'pointer' }}>
                                {hasMission ? (
                                    <text
                                        x={pos.x}
                                        y={pos.y - 34}
                                        textAnchor="middle"
                                        fontSize={22}
                                        fill="#f5b942"
                                    >
                                        ❗
                                    </text>
                                ) : null}
                                <circle
                                    cx={pos.x}
                                    cy={pos.y}
                                    r={26}
                                    fill="#1e2230"
                                    stroke={isCurrent ? '#f5b942' : '#7f8cff'}
                                    strokeWidth={isCurrent ? 4 : 2}
                                />
                                <text x={pos.x} y={pos.y + 8} textAnchor="middle" fontSize={22}>
                                    {node.emoji}
                                </text>
                                <text x={pos.x} y={pos.y + 46} textAnchor="middle" fontSize={13} fill="#e8eaf2">
                                    {node.name}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
            <div className="empty">
                Tap a connected place to travel · gold ring = current
            </div>
            <button className="btn" onClick={() => api.openPlace()}>Close</button>
        </div>
    );
}
