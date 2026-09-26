import { useGame } from '../game/GameContext';

/**
 * The camp fountain: revives the fainted characters whose corpse is
 * here — carried in by a party member or left in the camp itself.
 * Corpses that waited a week are already gone (dead for good).
 */
export function FountainScreen() {
    const api = useGame();
    const candidates = api.session.fountainCandidates();

    return (
        <div className="screen">
            <div className="card place-hero">
                <div className="emoji">⛲</div>
                <h1>The Fountain</h1>
                <p>The waters of the Order bring the fallen back — if their body makes it here within a week.</p>
            </div>

            {candidates.length === 0 ? (
                <div className="empty">Nobody lies here waiting for the waters.</div>
            ) : (
                candidates.map(({ character, daysLeft }) => (
                    <div key={character.id} className="menu-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontWeight: 600 }}>
                                ⚰️ {character.name}
                            </span>
                            <span className="tag">
                                {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'last day!'}
                            </span>
                        </span>
                        <button
                            className="btn btn--primary"
                            onClick={() => {
                                const result = api.session.reviveAtFountain(character.id);
                                api.refresh();
                                api.showToast(result.message);
                            }}
                        >
                            ✨ Revive
                        </button>
                    </div>
                ))
            )}

            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
