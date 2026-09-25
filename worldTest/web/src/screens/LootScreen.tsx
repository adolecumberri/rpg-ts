import { useGame } from '../game/GameContext';
import { CATEGORY_ICONS, dropTableSummaries } from '@core';

export function LootScreen() {
    const api = useGame();
    const summaries = dropTableSummaries(api.session);

    return (
        <div className="screen">
            {summaries.map((summary) => (
                <div key={summary.source} className="card" style={{ padding: 12 }}>
                    <div style={{ fontWeight: 600 }}>{summary.source}</div>
                    <div className="divider" style={{ margin: '8px 0' }} />
                    {summary.rows.length === 0 ? (
                        <div className="empty" style={{ padding: 6 }}>No drops.</div>
                    ) : (
                        summary.rows.map((row) => {
                            const entry = api.session.itemTable.get(row.itemId);
                            return (
                                <div key={row.itemId} style={{ margin: '8px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <span>
                                            {entry ? CATEGORY_ICONS[entry.category ?? 'utility'] ?? '🎒' : '🎒'} {row.itemName}
                                        </span>
                                        <span className="tag">
                                            {row.minQty === row.maxQty ? `x${row.minQty}` : `x${row.minQty}-${row.maxQty}`}
                                        </span>
                                    </div>
                                    <div className="bar" style={{ marginTop: 4, height: 8 }}>
                                        <div className="bar-fill xp" style={{ width: `${Math.round(row.chance * 100)}%` }} />
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                        {Math.round(row.chance * 100)}% chance
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ))}
            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
