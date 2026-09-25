import { missionPlaceNames } from '@core';
import { useGame } from '../game/GameContext';

/**
 * Mission detail only: the description, the place it happens in, the
 * requirements, and the accept/cancel/back actions. Everything else
 * lives in the world (the map marks the place with ❗).
 */
export function MissionScreen({ missionId }: { missionId: string }) {
    const api = useGame();
    const runner = api.session.missions.runner(missionId);
    const mission = api.session.missions.mission(missionId);

    if (!mission) {
        return (
            <div className="screen">
                <div className="empty">Unknown mission.</div>
                <button className="btn" onClick={() => api.back()}>Back</button>
            </div>
        );
    }

    const accepted = Boolean(runner && !runner.isComplete() && !runner.isFailed());
    const completed = Boolean(runner?.isComplete());
    const places = missionPlaceNames(mission);
    const requirements = api.session.missionRequirementsMet(missionId);

    const requirementLines = (): string[] => {
        const lines: string[] = [];
        if (mission.requirements?.gold) {
            lines.push(`🪙 ${mission.requirements.gold} gold`);
        }
        for (const entry of mission.requirements?.items ?? []) {
            const name = api.session.itemTable.get(entry.itemId)?.name ?? entry.itemId;
            lines.push(`🎒 ${entry.quantity}× ${name}`);
        }
        return lines;
    };

    const accept = () => {
        const started = api.session.startMission(missionId);
        api.refresh();
        if (started) {
            api.showToast(`Mission accepted: ${mission.title}`);
            api.back();
        } else {
            api.showToast(requirements.reason ?? 'The mission cannot be accepted.');
        }
    };

    const cancel = () => {
        const cancelled = api.session.cancelMission(missionId);
        api.refresh();
        api.showToast(cancelled ? `Mission cancelled: ${mission.title}` : 'This mission cannot be cancelled.');
        if (cancelled) api.back();
    };

    const requirementChips = requirementLines();

    return (
        <div className="screen">
            <div className="card place-hero">
                <div className="emoji">📜</div>
                <h1>{mission.title}</h1>
                <p>{mission.description ?? 'No description.'}</p>
                {places.length > 0 ? (
                    <div className="tag">📍 {places.join(' · ')}</div>
                ) : null}
            </div>

            {!accepted && !completed && requirementChips.length > 0 ? (
                <div className="card">
                    <div className="section-title">Requirements</div>
                    {requirementChips.map((line, index) => (
                        <div
                            key={index}
                            className="stat-row"
                            style={{ color: requirements.ok ? 'var(--text)' : 'var(--danger, #ef5350)' }}
                        >
                            <span className="label">{index + 1}</span>
                            <span>{line}</span>
                            <span>{requirements.ok ? '✅' : '❌'}</span>
                        </div>
                    ))}
                </div>
            ) : null}

            {completed ? (
                <div className="card" style={{ textAlign: 'center', padding: 24 }}>
                    <div style={{ fontSize: 44 }}>✅</div>
                    <p className="empty" style={{ padding: 0 }}>Mission complete.</p>
                </div>
            ) : null}

            {accepted ? (
                <button className="btn btn--danger" onClick={cancel}>Cancel mission</button>
            ) : completed ? null : (
                <button className="btn btn--primary" onClick={accept}>Accept</button>
            )}
            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
