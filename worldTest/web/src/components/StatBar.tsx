export function StatBar({
    label,
    value,
    max,
    variant = 'hp',
    suffix,
}: {
    label: string;
    value: number;
    max: number;
    variant?: 'hp' | 'xp';
    suffix?: string;
}) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

    return (
        <div className="stat-row">
            <span className="label">{label}</span>
            <div className="bar">
                <div className={`bar-fill ${variant}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="value">
                {Math.round(value)}
                {suffix ? ` ${suffix}` : ''}
            </span>
        </div>
    );
}
