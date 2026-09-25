import type { TeamPosition } from '@rpg';
import { TEAM_POSITIONS } from '@rpg';
import { useGame } from '../game/GameContext';
import { CharacterCard } from '../components/CharacterCard';

const POSITION_LABELS: Record<TeamPosition, string> = {
    front: '🛡️ Front ×3',
    center: '⚔️ Center ×2',
    back: '🏹 Back ×1',
};

export function TeamScreen() {
    const api = useGame();
    const members = api.team.getAll();
    const activeMissions = api.session.missions.activeMissions();

    return (
        <div className="screen">
            {activeMissions.length > 0 ? (
                <div className="card">
                    <div className="section-title">📜 Accepted missions</div>
                    {activeMissions.map((runner) => {
                        const owner = api.session.roster.character(runner.acceptedBy());
                        return (
                            <div key={runner.missionId()} className="stat-row">
                                <span className="label">{owner?.name ?? runner.acceptedBy()}</span>
                                <span style={{ flex: 1 }}>{runner.title()}</span>
                                <button
                                    className="btn"
                                    style={{ padding: '4px 10px', fontSize: 12, minWidth: 0, flex: 'none' }}
                                    onClick={() => api.navigate({ name: 'mission', missionId: runner.missionId() })}
                                >
                                    Open
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : null}
            {members.length === 0 ? (
                <div className="empty">No party members.</div>
            ) : (
                members.map((member) => (
                    <div key={member.id} className="team-member">
                        <CharacterCard
                            character={member}
                            onClick={() => api.navigate({ name: 'character', characterId: member.id })}
                        />
                        <div className="btn-row position-row">
                            {TEAM_POSITIONS.map((position) => (
                                <button
                                    key={position}
                                    className={`btn position-btn${member.position === position ? ' btn--selected' : ''}`}
                                    onClick={() => api.setPosition(member.id, position)}
                                >
                                    {POSITION_LABELS[position]}
                                </button>
                            ))}
                        </div>
                    </div>
                ))
            )}
            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
