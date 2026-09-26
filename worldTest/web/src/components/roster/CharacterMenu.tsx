import type { Character } from '@rpg';
import type { RowPosition } from '@core';
import { JOB_ICONS, heldJobOf } from '@core';
import { useGame } from '../../game/GameContext';
import { portraitUrl } from '../../constants/portraits';

const ROW_LABELS: Record<RowPosition, string> = {
    front: '🛡️ Front',
    center: '⚔️ Center',
    back: '🏹 Back',
};

/**
 * The single character menu of the squad page: add/remove from the
 * team, formation row, and equipment. Shared by the camp-roster grid
 * and the player-squad list.
 */
export function CharacterMenu({
    character,
    inSquad,
    fainted,
    extras,
    maxExtras,
    onToggle,
    onPosition,
    onClose,
}: {
    character: Character;
    inSquad: boolean;
    // The character lies fainted somewhere (a corpse): they cannot
    // join the squad until the fountain revives them.
    fainted?: boolean;
    // How many extra recruits are already picked (the player excluded)
    // and how many the mission allows.
    extras: number;
    maxExtras: number;
    onToggle: () => void;
    onPosition: (row: RowPosition) => void;
    onClose: () => void;
}) {
    const api = useGame();
    const job = heldJobOf(character);
    const isPlayer = character.id === 'player';

    return (
        <>
            <div className="messagebox-overlay" onClick={onClose} />
            <div className="modal-card">
                <button
                    type="button"
                    className="modal-close"
                    aria-label="Close"
                    onClick={onClose}
                >
                    ✕
                </button>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <img className="modal-portrait" src={portraitUrl()} alt={character.name} />
                    <div>
                        <h2 style={{ margin: 0 }}>{character.name}</h2>
                        <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                            {job ? `${JOB_ICONS[job.id] ?? '🧑‍🌾'} ${job.title}` : '👤 The Player'}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                            ⚔️ {Math.round(character.getStat('attack'))} · 🛡️ {Math.round(character.getStat('defence'))} · ⚡ {Math.round(character.getStat('speed'))} · ❤️ {Math.round(character.getStat('hp'))}/{Math.round(character.getStat('totalHp'))}
                        </div>
                    </div>
                </div>

                {!isPlayer ? (
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                        <button
                            className="btn btn--primary"
                            style={{ fontSize: 13, padding: '6px 16px' }}
                            disabled={fainted || (!inSquad && extras >= maxExtras)}
                            onClick={onToggle}
                        >
                            {fainted
                                ? '⚰️ Fainted — take them to the fountain'
                                : inSquad ? '🏕️ Back to camp' : `➕ Add to squad (${extras}/${maxExtras})`}
                        </button>
                    </div>
                ) : null}

                {inSquad ? (
                    <div>
                        <div className="section-title" style={{ margin: '10px 0 4px' }}>Formation</div>
                        <div className="btn-row">
                            {(['front', 'center', 'back'] as RowPosition[]).map((row) => (
                                <button
                                    key={row}
                                    className={`btn position-btn${character.position === row ? ' btn--selected' : ''}`}
                                    onClick={() => onPosition(row)}
                                >
                                    {ROW_LABELS[row]}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                <button
                    className="menu-item"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                        api.navigate({ name: 'character', characterId: character.id });
                        onClose();
                    }}
                >
                    <span className="menu-icon">🎒</span>
                    <span className="menu-label">Equipment</span>
                </button>
            </div>
        </>
    );
}
