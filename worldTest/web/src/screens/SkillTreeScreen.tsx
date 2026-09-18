import { useGame } from '../game/GameContext';
import { buildSkillTreeView } from '@core';

const NODE_X = 170;
const NODE_Y = (index: number) => 64 + index * 92;

export function SkillTreeScreen({ characterId }: { characterId: string }) {
    const api = useGame();
    const character = api.team.getCharacter(characterId);
    const tree = api.session.skillTreeOf(characterId);

    if (!character || !tree) {
        return (
            <div className="screen">
                <div className="empty">No skill tree for this character.</div>
                <button className="btn" onClick={() => api.back()}>Back</button>
            </div>
        );
    }

    const context = { character, session: api.session, tree };
    const view = buildSkillTreeView(tree, context);
    const indexOf = (id: string) => view.nodes.findIndex((node) => node.id === id);

    return (
        <div className="screen">
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="section-title" style={{ margin: 0 }}>{character.name} · Skill Tree</span>
                <span className="tag">Lv {character.experience.level}</span>
            </div>

            <div className="card" style={{ padding: 6, overflow: 'hidden' }}>
                <svg viewBox={`0 0 340 ${view.nodes.length * 92 + 20}`} style={{ width: '100%', height: 'auto' }}>
                    {view.edges.map((edge) => {
                        const fromIndex = indexOf(edge.from);
                        const toIndex = indexOf(edge.to);
                        if (fromIndex < 0 || toIndex < 0) return null;
                        return (
                            <line
                                key={`${edge.from}|${edge.to}`}
                                x1={NODE_X}
                                y1={NODE_Y(fromIndex) + 30}
                                x2={NODE_X}
                                y2={NODE_Y(toIndex) - 30}
                                stroke="#7f8cff"
                                strokeWidth={2}
                            />
                        );
                    })}
                    {view.nodes.map((node, index) => (
                        <g key={node.id}>
                            <circle
                                cx={NODE_X}
                                cy={NODE_Y(index)}
                                r={30}
                                fill={node.learned ? '#f5b942' : '#1e2230'}
                                stroke={node.learned ? '#f5b942' : node.unlockable ? '#66bb6a' : '#4a5068'}
                                strokeWidth={3}
                            />
                            <text
                                x={NODE_X}
                                y={NODE_Y(index) + 5}
                                textAnchor="middle"
                                fontSize={10}
                                fill={node.learned ? '#20160a' : '#e8eaf2'}
                            >
                                {node.name.slice(0, 12)}
                            </text>
                        </g>
                    ))}
                </svg>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 11, color: 'var(--muted)', padding: '6px 0' }}>
                    <span>🟡 learned</span>
                    <span>🟢 unlockable</span>
                    <span>⚪ locked</span>
                </div>
            </div>

            {tree.nodes.map((node) => {
                const learned = tree.isLearned(node.id);
                const unlocked = tree.canUnlock(node, context);
                return (
                    <div key={node.id} className="card" style={{ padding: 12 }}>
                        <div style={{ fontWeight: 600 }}>
                            {node.name}
                            {learned ? <span className="tag" style={{ marginLeft: 8, color: 'var(--heal)' }}>✓ Learned</span> : null}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0' }}>{node.description}</div>

                        <div style={{ fontSize: 12, marginTop: 6 }}>
                            {node.conditions.map((condition, index) => {
                                const met = condition.isMet(context);
                                return (
                                    <div key={index} style={{ color: met ? 'var(--heal)' : 'var(--danger)' }}>
                                        {met ? '✓' : '✗'} {condition.describe()}
                                    </div>
                                );
                            })}
                        </div>

                        {!learned ? (
                            <button
                                className="btn"
                                style={{ marginTop: 8 }}
                                disabled={!unlocked}
                                onClick={() => {
                                    const result = api.session.unlockNode(characterId, node.id);
                                    api.refresh();
                                    api.showToast(result.message);
                                }}
                            >
                                Unlock
                            </button>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}
