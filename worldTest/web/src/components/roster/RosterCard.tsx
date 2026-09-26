import type { Character } from '@rpg';
import { portraitUrl } from '../../constants/portraits';
import { JOB_ICONS, heldJobOf } from '@core';

/**
 * A camp-roster card for the 3-column grid: default portrait, name,
 * the character's Job and the full stat line.
 */
export function RosterCard({
    character,
    onClick,
    active,
    tag,
}: {
    character: Character;
    onClick?: () => void;
    active?: boolean;
    // Small badge under the class line (e.g. '⚰️ Fainted').
    tag?: string;
}) {
    const job = heldJobOf(character);
    return (
        <button
            type="button"
            className={`roster-card${active ? ' roster-card--active' : ''}`}
            onClick={onClick}
            style={tag ? { opacity: 0.7 } : undefined}
        >
            <img className="roster-card-portrait" src={portraitUrl()} alt={character.name} />
            <div className="roster-card-name">{character.name}</div>
            <div className="roster-card-class">
                {job ? `${JOB_ICONS[job.id] ?? '🧑‍🌾'} ${job.title}` : '👤 The Player'}
            </div>
            {tag ? (
                <div className="roster-card-class" style={{ color: 'var(--warn, #e0a458)' }}>{tag}</div>
            ) : null}
            <div className="roster-card-stats">
                <span>⚔️ {Math.round(character.getStat('attack'))}</span>
                <span>🛡️ {Math.round(character.getStat('defence'))}</span>
                <span>⚡ {Math.round(character.getStat('speed'))}</span>
                <span>❤️ {Math.round(character.getStat('hp'))}/{Math.round(character.getStat('totalHp'))}</span>
            </div>
        </button>
    );
}
