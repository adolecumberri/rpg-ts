import type { Character } from '@rpg';
import { JOB_ICONS, heldJobOf } from '@core';
import { SPRITES, spriteRoleOf } from '../../assets/sprites';

/**
 * One squad card on the team page: the character's idle sprite, name
 * and job line. Purely presentational — the page owns the selection.
 */
export function TeamCard({
    character,
    selected = false,
    onClick,
}: {
    character: Character;
    selected?: boolean;
    onClick?: () => void;
}) {
    const job = heldJobOf(character);
    const role = spriteRoleOf(character);
    const idle = role ? SPRITES[role].idle : undefined;
    const jobLine = job ? `${JOB_ICONS[job.id] ?? ''} ${job.title}` : 'The Player';

    return (
        <button
            type="button"
            className={`team-card${selected ? ' pixel-cell--selected' : ''}`}
            onClick={onClick}
        >
            {idle ? (
                <div className="battle-card-sprite">
                    <div
                        className="battle-card-sprite-layer battle-card-sprite-layer--idle"
                        style={{ backgroundImage: `url(${idle})` }}
                    />
                </div>
            ) : (
                <span className="battle-card-icon">{JOB_ICONS[job?.id ?? ''] ?? '👤'}</span>
            )}
            <span className="team-card-name">{character.name}</span>
            <span className="team-card-job">{jobLine}</span>
        </button>
    );
}
