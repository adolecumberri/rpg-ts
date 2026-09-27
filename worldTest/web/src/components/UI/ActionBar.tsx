import { useEffect, useState } from 'react';

/**
 * One button of the action bar. The bar only renders; the screen owns
 * which actions exist right now (skills, enemies, menu...).
 */
export type ActionButton = {
    id: string;
    label: string;
    icon?: string;
    // Small hint under the label: cost, range, target hp, "out of
    // reach"... Also used as the disabled reason when provided.
    sub?: string;
    disabled?: boolean;
    disabledReason?: string;
    tone?: 'default' | 'primary' | 'danger';
    // Optional: screens define the data, the wiring attaches handlers.
    onClick?: () => void;
};

// How the bar arranges the actions for the current page size.
function layoutFor(count: number): 'rows' | 'grid' {
    return count <= 3 ? 'rows' : 'grid';
}

const PAGE_SIZE = 5; // 2x2 + one full-width row

/**
 * The bottom action bar: appears only while there are actions to take,
 * and lays them out by count — 1-3 stacked rows, 4 a 2x2 grid, 5 a 2x2
 * plus a last full-width row, 6+ paginated (5 per page). The component
 * owns the pagination cursor and resets it whenever the action list
 * changes; disabled taps surface the reason inline for a moment.
 */
export function ActionBar({ actions }: { actions: ActionButton[] }) {
    const [page, setPage] = useState(0);
    const [hint, setHint] = useState<string | null>(null);

    // A fresh action list starts over at the first page.
    useEffect(() => {
        setPage(0);
    }, [actions]);

    useEffect(() => {
        if (!hint) return;
        const timer = window.setTimeout(() => setHint(null), 2200);
        return () => window.clearTimeout(timer);
    }, [hint]);

    if (actions.length === 0) return null;

    const pages = Math.ceil(actions.length / PAGE_SIZE);
    const start = page * PAGE_SIZE;
    const visible = actions.slice(start, start + PAGE_SIZE);
    const layout = layoutFor(visible.length);

    const press = (action: ActionButton) => {
        if (action.disabled) {
            setHint(action.disabledReason ?? action.sub ?? `${action.label} is unavailable.`);
            return;
        }
        action.onClick?.();
    };

    return (
        <div className="action-bar">
            {hint ? <div className="action-bar-hint">{hint}</div> : null}
            <div className={`action-bar-grid action-bar-grid--${layout}`}>
                {visible.map((action) => {
                    const tone = action.tone === 'primary'
                        ? 'pixel-btn--primary'
                        : action.tone === 'danger' ? 'pixel-btn--danger' : '';
                    return (
                        <button
                            key={action.id}
                            type="button"
                            className={`action-btn pixel-btn ${tone}`}
                            disabled={action.disabled}
                            onClick={() => press(action)}
                        >
                            <span className="action-btn-label">
                                {action.icon ? <span className="action-btn-icon">{action.icon}</span> : null}
                                {action.label}
                            </span>
                            {action.sub ? (
                                <span className="action-btn-sub">
                                    {action.disabled && action.disabledReason
                                        ? action.disabledReason
                                        : action.sub}
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </div>
            {pages > 1 ? (
                <div className="action-bar-pages">
                    <button
                        type="button"
                        className="pixel-btn"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        ‹
                    </button>
                    <span className="action-bar-page-label">{page + 1}/{pages}</span>
                    <button
                        type="button"
                        className="pixel-btn"
                        disabled={page >= pages - 1}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        ›
                    </button>
                </div>
            ) : null}
        </div>
    );
}
