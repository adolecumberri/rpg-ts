import { BattleCard } from './BattleCard';
import type { BattleUnit } from './Battlefield';

/**
 * The actions battlefield view. Unlike the ticks view (rows grouped by
 * formation), a skirmish team is a single pool of full-size fichas
 * (shrink = false, so level and hp show) laid out in adaptive rows:
 *
 *   1 row while everyone fits, 2, 3... up to 4.
 *
 * The math runs in UI units (1u = 4px, the page is 80u wide): the
 * ficha box is 12u x 16u (pixel-cell), the panel leaves 2u of padding
 * per side and the rows 2u of side margin, and the nominal gap between
 * fichas is 2u. That gives 5 fichas per row in a full-width panel; the
 * row count is then just ceil(count / 5) clamped to 1-4. The panel is
 * a fixed box (the parent gives it half the page) — oversized armies
 * scroll instead of clipping.
 */
const CARD_W = 12; // u — the ficha box (pixel-cell)
const CARD_GAP = 2; // u — nominal gap between fichas
const SIDE_MARGIN = 2; // u — row margin at each side
const INNER_W = 76; // u — 80u page minus the panel's 2u padding x 2
const MAX_ROWS = 4;

/** How many card rows the pool needs, clamped to 1-4. */
function rowsFor(count: number): number {
    const layoutW = INNER_W - SIDE_MARGIN * 2;
    const perRow = Math.max(1, Math.floor((layoutW + CARD_GAP) / (CARD_W + CARD_GAP)));
    return Math.min(MAX_ROWS, Math.max(1, Math.ceil(count / perRow)));
}

/** Balanced split into `rows` lines (4/3 instead of 5/2). */
function splitRows(units: BattleUnit[], rows: number): BattleUnit[][] {
    const lines: BattleUnit[][] = [];
    const base = Math.floor(units.length / rows);
    const extra = units.length % rows;
    let cursor = 0;
    for (let row = 0; row < rows; row++) {
        const size = base + (row < extra ? 1 : 0);
        lines.push(units.slice(cursor, cursor + size));
        cursor += size;
    }
    return lines.filter((line) => line.length > 0);
}

/**
 * One team panel for an actions fight: fixed full-width box (the
 * parent gives it the height), full-size fichas, no formation rows.
 */
export function ActionsBattlefield({
    units,
    selectedIds,
    activeId,
}: {
    units: BattleUnit[];
    selectedIds?: Set<string>;
    activeId?: string;
}) {
    const lines = splitRows(units, rowsFor(units.length));
    return (
        <div className="actions-panel">
            {lines.map((line, index) => (
                <div className="actions-row" key={`row_${index}`}>
                    {line.map((unit) => (
                        <BattleCard
                            key={unit.id}
                            name={unit.name}
                            hp={unit.hp}
                            maxHp={unit.maxHp}
                            sub={unit.sub}
                            icon={unit.icon}
                            sprite={unit.sprite}
                            level={unit.level}
                            selected={selectedIds ? selectedIds.has(unit.id) : false}
                            active={unit.id === activeId}
                            dead={unit.hp <= 0}
                            dataId={unit.id}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
