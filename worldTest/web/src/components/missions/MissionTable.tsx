/**
 * The mission table (reusable): one row per mission with the Title,
 * Level, Days and Comisión columns. The board (Nuevas/Otras) and the
 * player's owned missions (Aceptadas) render through this same
 * component — the page normalizes its rows.
 */
export type MissionTableRow = {
    id: string;
    title: string;
    level: number;
    // The days cell: '20d' when offered (the deadline window in Nuevas,
    // the season countdown in Otras), '3 left' when owned, '—' otherwise.
    days: string;
    commission: number;
    // Repeatable missions already completed show the checkmark.
    repeat?: boolean;
};

export function MissionTable({
    rows,
    onSelect,
}: {
    rows: MissionTableRow[];
    onSelect?: (id: string) => void;
}) {
    return (
        <div className="mission-table">
            <div className="mission-table-head">
                <span className="mission-cell mission-cell--title">Mission</span>
                <span className="mission-cell mission-cell--num">Lvl</span>
                <span className="mission-cell mission-cell--num">Days</span>
                <span className="mission-cell mission-cell--num">Comis</span>
            </div>
            {rows.length === 0 ? (
                <div className="mission-table-empty">No missions here.</div>
            ) : (
                rows.map((row) => (
                    <button
                        key={row.id}
                        type="button"
                        className="mission-row"
                        onClick={() => onSelect?.(row.id)}
                    >
                        <span className="mission-cell mission-cell--title">
                            {row.repeat ? (
                                <span className="mission-check" aria-hidden="true">✓</span>
                            ) : null}
                            <span className="mission-title-text">{row.title}</span>
                        </span>
                        <span className="mission-cell mission-cell--num">{row.level}</span>
                        <span className="mission-cell mission-cell--num">{row.days}</span>
                        <span className="mission-cell mission-cell--num mission-cell--gold">
                            {row.commission}
                        </span>
                    </button>
                ))
            )}
        </div>
    );
}
