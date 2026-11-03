import { ALL_JOBS, DEFAULT_GROWTH_RATE, resolveGrowth, specOf } from '@core';
import type { Job, StatKey } from '@core';
import { STAT_CATALOG } from '../../game/statCatalog';
import './JobsScreen.css';

// ---------------------------------------------------------------------------
// The job codex dev page: every job's identity, its stat table (level-1
// value = DEFAULT_BASE + job bonus, with the growth ratio and its resolved
// per-level gain) and its skill ladder (titles only).
// ---------------------------------------------------------------------------

type StatRow = { key: StatKey; label: string };

// The stats a job shows: the catalog entries plus the two hp keys that the
// catalog does not carry.
const JOB_STATS: StatRow[] = [
    { key: 'hp', label: 'HP' },
    { key: 'totalHp', label: 'Max HP' },
    ...STAT_CATALOG.map((entry) => ({ key: entry.key, label: entry.label })),
];

const skillName = (id: string | undefined): string => (id ? specOf(id)?.name ?? id : '—');

function JobCard({ job }: { job: Job }) {
    const growth = resolveGrowth(job.growth ?? {}).gainPerLevel;
    const ladder = job.progression?.skills ?? [];
    const enhancementAt = job.progression?.enhancementAt ?? [];

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

            <table className="jobdev-table">
                <thead>
                    <tr>
                        <th className="jobdev-th">Stat</th>
                        <th className="jobdev-th jobdev-th--num">Job bonus</th>
                        <th className="jobdev-th jobdev-th--num">Growth</th>
                    </tr>
                </thead>
                <tbody>
                    {JOB_STATS.map((stat) => {
                        const bonus = job.statBonuses[stat.key] ?? 0;
                        const ratio = (job.growth ?? {})[stat.key] ?? 1;
                        const gain = growth[stat.key] ?? 0;
                        return (
                            <tr className="jobdev-row" key={stat.key}>
                                <td className="jobdev-td">{stat.label}</td>
                                <td className="jobdev-td jobdev-td--num">
                                    <span className={`jobdev-bonus${bonus < 0 ? ' jobdev-bonus--down' : ''}`}>
                                        {bonus > 0 ? '+' : ''}{bonus}
                                    </span>
                                </td>
                                <td className="jobdev-td jobdev-td--num">
                                    <span className="jobdev-ratio">×{ratio.toFixed(2)}</span>
                                    <span className="jobdev-gain">{gain.toFixed(2)}/lvl</span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="jobdev-foot">
                Growth = DEFAULT_MAX × {DEFAULT_GROWTH_RATE} / 100 × ratio (the ratio multiplies the
                default gain; it is not added to it).
            </div>

            <div className="jobdev-section">
                <span className="jobdev-cell--label">Base kit</span>
                <span className="jobdev-value">
                    {(job.progression?.skills ?? [])
                        .filter((plan) => plan.atJobLevel === 1)
                        .map((plan) => skillName(plan.skillId))
                        .join(' · ') || '—'}
                </span>
            </div>

            <div className="jobdev-section">
                <span className="jobdev-cell--label">Ladder</span>
                <div className="jobdev-ladder">
                    {ladder.length === 0 ? (
                        <span className="jobdev-value">no ladder</span>
                    ) : ladder.map((plan) => (
                        <div className="jobdev-ladder-row" key={plan.skillId}>
                            <span className="jobdev-ladder-level">Lv {plan.atJobLevel}</span>
                            <span className="jobdev-ladder-name">{skillName(plan.skillId)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="jobdev-section">
                <span className="jobdev-cell--label">Mastery</span>
                <span className="jobdev-value">
                    {job.progression ?
                        `${job.progression.masteryTitle} · enhancement picks at levels ${enhancementAt.join(', ')}` :
                        '—'}
                </span>
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
