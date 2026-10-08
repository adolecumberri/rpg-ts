import { useState } from 'react';
import type { ReactNode } from 'react';
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

type ReportSection = {
    title: string;
    measure: (stats: BattleFighterStats) => number;
    value: (stats: BattleFighterStats) => ReactNode;
};

const SECTIONS: Record<ReportSectionId, ReportSection> = {
    dealt: {
        title: 'Dealt',
        measure: (stats) => totalOf(stats.damageDealt),
        value: (stats) => <KindTotals totals={stats.damageDealt} />,
    },
    healing: {
        title: 'Healing',
        measure: (stats) => stats.healingGiven,
        value: (stats) => <span>{Math.round(stats.healingGiven)}</span>,
    },
    taken: {
        title: 'Taken',
        measure: (stats) => totalOf(stats.damageReceived),
        value: (stats) => <KindTotals totals={stats.damageReceived} />,
    },
};

/**
 * The post-battle stats, tabbed so the whole report fits the screen:
 *
 *  1. Team vs team — one tab per side with the active team's totals
 *     (dealt, received, heals, kills) below.
 *  2. One tab per section — Damage dealt, Healing given, Damage taken
 *     — each showing the team's top N rows.
 *  3. Each fighter row opens the per-character detail (dealt/received
 *     by kind, heals given/received, kills).
 *
 * Fed by the BattleTracker's report.
 */
export function BattleReportPanel({
    report,
    sides,
    limit = 5,
    nameOf = (id) => id,
}: {
    report: BattleReport;
    sides: [BattleReportSide, BattleReportSide];
    limit?: number;
    nameOf?: (id: string) => string;
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
            <div className="pixel-title">BATTLE REPORT</div>
            <div className="report-tabs">
                {sides.map((side, index) => (
                    <button
                        key={side.name}
                        type="button"
                        className={`pixel-btn report-tab${team === index ? ' pixel-btn--primary' : ''}`}
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
                        className={`pixel-btn report-tab--section${section === id ? ' pixel-btn--primary' : ''}`}
                        onClick={() => selectSection(id)}
                    >
                        {SECTIONS[id].title}
                    </button>
                ))}
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
                            <span className="report-cell">{active.value(fighter.stats)}</span>
                        </button>
                        {openFighter === fighter.id ? (
                            <FighterDetail stats={fighter.stats} />
                        ) : null}
                    </div>
                ))
            )}
        </div>
    );
}
