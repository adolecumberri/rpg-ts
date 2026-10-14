import './StatBar.css';

/**
 * The reusable value bar: a dark track with a colored fill sized by
 * value/max. The caller passes the fill color, the pixel width (and
 * optional height) and the two values — the arena's unit bars (hp,
 * mana) and the character profile (hp, mana, xp) both use it.
 */
export function StatBar({
    value,
    max,
    type,
    width = 40,
    height = 4,
}: {
    value: number;
    max: number;
    width?: number;
    height?: number;
    type: 'hp' | 'mana' | 'xp' | 'enemy-hp';
}) {
    let color;
    switch (type) {
        case 'hp':
            color = 'linear-gradient(to right, var(--ally-hp-bar), var(--ally-hp-bar-end))';
            break;
        case 'mana':
            color = 'linear-gradient(to right, var(--mana-bar), var(--mana-bar-end))';
            break;
        case 'xp':
            color = 'linear-gradient(to right, var(--exp-bar), var(--exp-bar-end))';
            break;
        case 'enemy-hp':
            color = 'linear-gradient(to right, var(--enemy-hp-bar), var(--enemy-hp-bar-end))';
            break;
    }

    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    return (
        <div className="stat-bar" style={{ width, height }}>
            <span className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
    );
}
