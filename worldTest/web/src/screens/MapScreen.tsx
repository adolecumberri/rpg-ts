import { useGame } from '../game/GameContext';
import { PLACES, buildTravelGraph } from '@core';

const POSITIONS: Record<string, { x: number; y: number }> = {
    central_town: { x: 380, y: 260 },
    training: { x: 170, y: 260 },
    forest: { x: 560, y: 200 },
    cave: { x: 740, y: 140 },
    north_town: { x: 380, y: 100 },
    south_town: { x: 380, y: 420 },
    east_town: { x: 740, y: 340 },
};

export function MapScreen() {
    const api = useGame();
    const graph = buildTravelGraph(PLACES, api.session.unlocked);

    const goTo = (placeId: string) => {
        if (placeId === api.session.currentPlaceId) return;
        const result = api.session.travel(placeId);
        if (result.ok) {
            api.refresh();
            api.back();
        } else {
            api.showToast(result.message ?? 'You cannot travel there.');
        }
    };

    return (
        <div className="screen">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <svg viewBox="0 0 900 520" style={{ width: '100%', height: 'auto' }}>
                    {graph.edges.map((edge) => {
                        const a = POSITIONS[edge.from];
                        const b = POSITIONS[edge.to];
                        if (!a || !b) return null;
                        return (
                            <line
                                key={`${edge.from}|${edge.to}`}
                                x1={a.x}
                                y1={a.y}
                                x2={b.x}
                                y2={b.y}
                                stroke={edge.locked ? '#4a5068' : '#7f8cff'}
                                strokeWidth={3}
                                strokeDasharray={edge.locked ? '7 7' : undefined}
                            />
                        );
                    })}
                    {graph.nodes.map((node) => {
                        const pos = POSITIONS[node.id] ?? { x: 0, y: 0 };
                        const isCurrent = node.id === api.session.currentPlaceId;
                        return (
                            <g key={node.id} onClick={() => goTo(node.id)} style={{ cursor: 'pointer' }}>
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
                Tap a connected place to travel · gold ring = current · dashed = locked
            </div>
        </div>
    );
}
