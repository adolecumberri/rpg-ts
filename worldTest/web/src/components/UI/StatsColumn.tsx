import { Icon } from './Icon';
import type { IconId } from './Icon';

/** One row of the stats column: icon, label and the formatted value. */
export type StatRow = {
    icon: IconId;
    label: string;
    value: string;
};

/**
 * The reusable stats column: icon + right-aligned name + fixed-width
 * value lines (the team-data-stats design). The character page renders
 * it with the character's totals; the equipment page renders it with
 * the equipped items' (or a previewed item's) bonuses.
 */
export function StatsColumn({ rows }: { rows: StatRow[] }) {
    return (
        <div className="team-data-stats">
            {rows.map((row) => (
                <div key={row.label} className="team-stat-line">
                    <span className="team-stat-icon">
                        <Icon id={row.icon} size={4} />
                    </span>
                    <span className="team-stat-name">{row.label}</span>
                    <span className="team-stat-value">{row.value}</span>
                </div>
            ))}
        </div>
    );
}
