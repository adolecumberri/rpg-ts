import { ALL_JOBS, DEFAULT_BASE, resolveGrowth, specOf } from '@core';
import type { Job } from '@core';
import { STAT_CATALOG } from '../../game/statCatalog';
import type { StatKey } from '../../game/statCatalog';
import './JobsScreen.css';

// ---------------------------------------------------------------------------
// The job codex dev page: every job's identity, its level-1 stat bonuses,
// its growth ratios (with the resolved per-level gain), its weapon/shield
// rules and its full skill ladder with the three rank specs.
// ---------------------------------------------------------------------------

type StatRow = { key: string; label: string };

// The stats a job shows: the catalog entries plus the two hp keys that the
// catalog does not carry.
const JOB_STATS: StatRow[] = [
    { key: 'hp', label: 'HP' },
    { key: 'totalHp', label: 'Max HP' },
    ...STAT_CATALOG.map((entry) => ({ key: entry.key as string, label: entry.label })),
];

const skillName = (id: string | undefined): string => (id ? specOf(id)?.name ?? id : '—');

/** '4 mp · 1 target' style summary of one rank spec. */
function rankSummary(id: string): string {
    const spec = specOf(id);
    if (!spec) return '—';
    const parts: string[] = [];
    parts.push(`${spec.manaCost ?? 0} mp`);
    if (spec.numberOfTargets && spec.numberOfTargets > 1) parts.push(`${spec.numberOfTargets} targets`);
    if (spec.hpCostPercent) parts.push(`${spec.hpCostPercent}% hp`);
    if (spec.targeting !== 'ENEMY') parts.push(spec.targeting.toLowerCase());
    return parts.join(' · ');
}

function JobCard({ job }: { job: Job }) {
    const growth = resolveGrowth(job.growth ?? {}).gainPerLevel;
    const ladder = job.progression?.skills ?? [];
    const enhancementAt = job.progression?.enhancementAt ?? [];
    const bonusOf = (key: string): number => job.statBonuses[key as keyof typeof job.statBonuses] ?? 0;
    const formatBonus = (value: number): string => (value > 0 ? `+${value}` : String(value));

    return (
        <section className="jobdev-card">
            <header className="jobdev-head">
                <span className="jobdev-title">{job.title}</span>
                <span className="jobdev-id">{job.id}</span>
                <span className="jobdev-pills">
                    {job.weaponTypes.length > 0 ? job.weaponTypes.join(' · ') : 'no weapon'}
                    {job.canShield ? ' · shield' : ''}
                </span>
            </header>

            <div className="jobdev-grid">
                <div className="jobdev-cell jobdev-cell--label">Level-1 bonuses</div>
                <div className="jobdev-cell">
                    {JOB_STATS.map((stat) => {
                        const bonus = bonusOf(stat.key);
                        return (
                            <span className="jobdev-chip" key={stat.key}>
                                {stat.label} {formatBonus(bonus)}
                            </span>
                        );
                    })}
                </div>

                <div className="jobdev-cell jobdev-cell--label">Growth ratios</div>
                <div className="jobdev-cell jobdev-growth">
                    {JOB_STATS.map((stat) => {
                        const key = stat.key as StatKey;
                        const ratio = (job.growth ?? {})[key] ?? 1;
                        const gain = growth[key] ?? 1;
                        return (
                            <span className="jobdev-chip" key={stat.key}>
                                {stat.label} ×{ratio.toFixed(2)} → {gain.toFixed(1)}/lvl
                            </span>
                        );
                    })}
                </div>

                <div className="jobdev-cell jobdev-cell--label">Base kit</div>
                <div className="jobdev-cell">
                    {job.skillIds.length > 0 ? job.skillIds.map((id) => skillName(id)).join(' · ') : '—'}
                </div>

                <div className="jobdev-cell jobdev-cell--label">Common base</div>
                <div className="jobdev-cell">
                    HP {DEFAULT_BASE.hp} · ATQ {DEFAULT_BASE.attack} · DEF {DEFAULT_BASE.defence}
                </div>

                <div className="jobdev-cell jobdev-cell--label">Ladder</div>
                <div className="jobdev-cell jobdev-ladder">
                    {ladder.length === 0 ? (
                        <span className="jobdev-chip">no ladder</span>
                    ) : ladder.map((plan) => (
                        <div className="jobdev-ladder-row" key={plan.skillId}>
                            <span className="jobdev-ladder-level">Lv {plan.atJobLevel}</span>
                            <span className="jobdev-ladder-name">{skillName(plan.skillId)}</span>
                            <span className="jobdev-ladder-ranks">
                                {plan.ranks.map((id) => `${skillName(id)} (${rankSummary(id)})`).join('  →  ')}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="jobdev-cell jobdev-cell--label">Mastery</div>
                <div className="jobdev-cell">
                    {job.progression ?
                        `${job.progression.masteryTitle} · enhancement picks at levels ${enhancementAt.join(', ')}` :
                        '—'}
                </div>
            </div>
        </section>
    );
}

export function JobsScreen() {
    return (
        <div className="jobdev-page pixel-font">
            <div className="jobdev-page-head">
                <span className="jobdev-page-title">JOBS · CODEX</span>
                <span className="jobdev-page-sub">{ALL_JOBS.length} jobs</span>
            </div>
            {ALL_JOBS.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
    );
}
