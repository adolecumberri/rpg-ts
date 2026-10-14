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
    color,
    width = 40,
    height = 4,
}: {
    value: number;
    max: number;
    // The fill color (any CSS color): hp green/red, mana blue, xp gold.
    color: string;
    width?: number;
    height?: number;
}) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    return (
        <div className="stat-bar" style={{ width, height }}>
            <span className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
    );
}
