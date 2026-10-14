import { useState } from 'react';
import type { BattleReport, BattleFighterStats, DamageKindTotals } from '@core';

export type BattleReportSide = {
    name: string;
    // The fighter ids that fought on this side (order = display order).
    ids: string[];
};

const totalOf = (totals: DamageKindTotals): number =>
    totals.physical + totals.magical + totals.true;

/** The colored damage cell (physical red, magical blue, true white). */
function KindTotals({ totals }: { totals: DamageKindTotals }) {
    const parts = [
        totals.physical > 0 ? (
            <span key="physical" className="def-color--physical">{Math.round(totals.physical)}</span>
        ) : null,
        totals.magical > 0 ? (
            <span key="magical" className="def-color--magical">{Math.round(totals.magical)}</span>
        ) : null,
        totals.true > 0 ? (
            <span key="true" className="def-color--true">{Math.round(totals.true)}</span>
        ) : null,
    ].filter(Boolean);
    return <span className="report-kinds">{parts.length > 0 ? parts : '—'}</span>;
}

type FighterEntry = {
    id: string;
    stats: BattleFighterStats;
};

/** The full per-fighter detail, shown when a row is opened. */
function FighterDetail({ stats }: { stats: BattleFighterStats }) {
    return (
        <div className="report-detail">
            <span className="report-detail-label">dealt</span>
            <KindTotals totals={stats.damageDealt} />
            <span className="report-detail-label">received</span>
            <KindTotals totals={stats.damageReceived} />
            <span className="report-detail-label">heals given</span>
            <span>{Math.round(stats.healingGiven)}</span>
            <span className="report-detail-label">heals received</span>
            <span>{Math.round(stats.healingReceived)}</span>
            <span className="report-detail-label">kills</span>
            <span>{stats.kills}</span>
        </div>
    );
}

type ReportSectionId = 'dealt' | 'healing' | 'taken';

// A numeric cell of a row: the value and its kind color class.
type ReportCell = {
    value: number;
    cls: string;
};

type ReportSection = {
    title: string;
    measure: (stats: BattleFighterStats) => number;
    cells: (stats: BattleFighterStats) => ReportCell[];
    // The table column headers, same colors as the cells.
    headers: ReportCell[];
};

const PHYS: ReportCell = { value: 0, cls: 'report-phys' };
const MAG: ReportCell = { value: 0, cls: 'report-mag' };
const TRUE: ReportCell = { value: 0, cls: 'report-true' };

const SECTIONS: Record<ReportSectionId, ReportSection> = {
    dealt: {
        title: 'Dealt',
        measure: (stats) => totalOf(stats.damageDealt),
        cells: (stats) => [
            { ...PHYS, value: stats.damageDealt.physical },
            { ...MAG, value: stats.damageDealt.magical },
            { ...TRUE, value: stats.damageDealt.true },
        ],
        headers: [
            { ...PHYS, value: 0, cls: 'report-phys' },
            { ...MAG, value: 0, cls: 'report-mag' },
            { ...TRUE, value: 0, cls: 'report-true' },
        ],
    },
    healing: {
        title: 'Healing',
        measure: (stats) => stats.healingGiven,
        cells: (stats) => [{ value: stats.healingGiven, cls: 'report-heal' }],
        headers: [{ value: 0, cls: 'report-heal' }],
    },
    taken: {
        title: 'Taken',
        measure: (stats) => totalOf(stats.damageReceived),
        cells: (stats) => [
            { ...PHYS, value: stats.damageReceived.physical },
            { ...MAG, value: stats.damageReceived.magical },
            { ...TRUE, value: stats.damageReceived.true },
        ],
        headers: [
            { ...PHYS, value: 0, cls: 'report-phys' },
            { ...MAG, value: 0, cls: 'report-mag' },
            { ...TRUE, value: 0, cls: 'report-true' },
        ],
    },
};

const HEADER_LABELS: Record<string, string> = {
    'report-phys': 'PHYS',
    'report-mag': 'MAG',
    'report-true': 'TRUE',
    'report-heal': 'HEALS',
};

// The distribution bar segment class per cell index (kinds sections
// only; healing uses the single green segment).
const BAR_CLASSES = ['report-bar--physical', 'report-bar--magical', 'report-bar--true'];

/**
 * The post-battle stats, tabbed so the whole report fits the screen:
 *
 *  1. Team vs team — one tab per side with the active team's totals
 *     (dealt, received, heals, kills) below.
 *  2. One tab per section — Damage dealt, Healing given, Damage taken
 *     — each with column headers (COMBATANT | PHYS | MAG | TRUE), the
 *     team's top N rows, a damage-kind distribution bar under every
 *     row and a TOTAL strip under the table.
 *  3. Each fighter row opens the per-character detail.
 *
 * Fed by the BattleTracker's report.
 */
export function BattleReportPanel({
    report,
    sides,
    limit = 5,
    nameOf = (id) => id,
    onClose,
}: {
    report: BattleReport;
    sides: [BattleReportSide, BattleReportSide];
    limit?: number;
    nameOf?: (id: string) => string;
    onClose?: () => void;
}) {
    const statsById = new Map(report.map((entry) => [entry.id, entry.stats]));
    const [team, setTeam] = useState(0);
    const [section, setSection] = useState<ReportSectionId>('dealt');
    const [openFighter, setOpenFighter] = useState<string | null>(null);

    const fighters: FighterEntry[] = sides[team].ids
        .map((id) => ({ id, stats: statsById.get(id) }))
        .filter((entry): entry is FighterEntry => Boolean(entry.stats));

    // The active team's totals.
    const dealt: DamageKindTotals = { physical: 0, magical: 0, true: 0 };
    const received: DamageKindTotals = { physical: 0, magical: 0, true: 0 };
    let healing = 0;
    let kills = 0;
    for (const fighter of fighters) {
        dealt.physical += fighter.stats.damageDealt.physical;
        dealt.magical += fighter.stats.damageDealt.magical;
        dealt.true += fighter.stats.damageDealt.true;
        received.physical += fighter.stats.damageReceived.physical;
        received.magical += fighter.stats.damageReceived.magical;
        received.true += fighter.stats.damageReceived.true;
        healing += fighter.stats.healingGiven;
        kills += fighter.stats.kills;
    }

    const active = SECTIONS[section];
    // Top N by the measure, zero rows excluded.
    const top = [...fighters]
        .filter((fighter) => active.measure(fighter.stats) > 0)
        .sort((a, b) => active.measure(b.stats) - active.measure(a.stats))
        .slice(0, limit);

    // The TOTAL strip: the visible rows summed per column.
    const columnSums: number[] = top.reduce((sums, fighter) => {
        active.cells(fighter.stats).forEach((cell, index) => {
            sums[index] = (sums[index] ?? 0) + cell.value;
        });
        return sums;
    }, [] as number[]);

    const maxHeal = section === 'healing' ?
        Math.max(0, ...top.map((fighter) => fighter.stats.healingGiven)) :
        0;

    // The distribution bar under a row: the damage-kind share of the
    // row's own total (healing: share of the section's top healer).
    const barSegments = (fighter: FighterEntry): Array<{ cls: string; pct: number }> => {
        const cells = active.cells(fighter.stats);
        if (section === 'healing') {
            const pct = maxHeal > 0 ? Math.round((cells[0].value / maxHeal) * 100) : 0;
            return [{ cls: 'report-bar--heal', pct }];
        }
        const total = cells.reduce((sum, cell) => sum + cell.value, 0);
        if (total <= 0) return [];
        return cells
            .map((cell, index) => ({
                cls: BAR_CLASSES[index],
                pct: Math.round((cell.value / total) * 100),
            }))
            .filter((segment) => segment.pct > 0);
    };

    const selectTeam = (index: number) => {
        setTeam(index);
        setOpenFighter(null);
    };
    const selectSection = (id: ReportSectionId) => {
        setSection(id);
        setOpenFighter(null);
    };

    return (
        <div className="pixel-panel report-panel">
            <div className="report-head">
                <span className="report-title">BATTLE REPORT</span>
                {onClose ? (
                    <button type="button" className="report-close" onClick={onClose}>✕</button>
                ) : null}
            </div>
            <div className="report-tabs">
                {sides.map((side, index) => (
                    <button
                        key={side.name}
                        type="button"
                        className={`pixel-btn${team === index ? ' pixel-btn--primary' : ''}`}
                        onClick={() => selectTeam(index)}
                    >
                        {side.name}
                    </button>
                ))}
            </div>
            <div className="report-side-total">
                dealt <KindTotals totals={dealt} />
                {' · '}rec {Math.round(totalOf(received))}
                {' · '}heals {Math.round(healing)}
                {' · '}kills {kills}
            </div>
            <div className="report-tabs report-tabs--sections">
                {(Object.keys(SECTIONS) as ReportSectionId[]).map((id) => (
                    <button
                        key={id}
                        type="button"
                        className={`pixel-btn${section === id ? ' pixel-btn--primary' : ''}`}
                        onClick={() => selectSection(id)}
                    >
                        {SECTIONS[id].title}
                    </button>
                ))}
            </div>
            <div className="report-columns">
                <span className="report-name">COMBATANT</span>
                <span className="report-cells">
                    {active.headers.map((header, index) => (
                        <span key={index} className={`report-col ${header.cls}`}>
                            {HEADER_LABELS[header.cls]}
                        </span>
                    ))}
                </span>
            </div>
            {top.length === 0 ? (
                <div className="report-empty">Nothing to show.</div>
            ) : (
                top.map((fighter) => (
                    <div key={fighter.id} className="report-entry">
                        <button
                            type="button"
                            className="report-row"
                            onClick={() =>
                                setOpenFighter(openFighter === fighter.id ? null : fighter.id)}
                        >
                            <span className="report-name">{nameOf(fighter.id)}</span>
                            <span className="report-cells">
                                {active.cells(fighter.stats).map((cell, index) => (
                                    <span key={index} className={`report-col ${cell.cls}`}>
                                        {Math.round(cell.value)}
                                    </span>
                                ))}
                            </span>
                        </button>
                        <div className="report-bar">
                            {barSegments(fighter).map((segment, index) => (
                                <span
                                    key={index}
                                    className={segment.cls}
                                    style={{ width: `${segment.pct}%` }}
                                />
                            ))}
                        </div>
                        {openFighter === fighter.id ? (
                            <FighterDetail stats={fighter.stats} />
                        ) : null}
                    </div>
                ))
            )}
            {top.length > 0 ? (
                <div className="report-total">
                    <span className="report-total-label">TOTAL</span>
                    <span className="report-cells">
                        {columnSums.map((sum, index) => (
                            <span key={index} className={`report-col ${active.headers[index].cls}`}>
                                {Math.round(sum)}
                            </span>
                        ))}
                    </span>
                </div>
            ) : null}
        </div>
    );
}
