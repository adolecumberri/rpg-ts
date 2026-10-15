import type { Character } from '@rpg';
import { heldJobOf, pendingJobPicks } from '@core';
import { SPRITES, spriteRoleOf } from '../../assets/sprites';

/**
 * One squad card on the team page: the character's idle sprite, name
 * and job line. Purely presentational — the page owns the selection.
 * A gold ↑ badge marks a pending job level up (an enhancement pick
 * waiting for the player).
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
    const idle = role ? SPRITES[role].idle.sheet : undefined;
    const jobLine = job ? ` ${job.title}` : 'The Player';
    const pending = pendingJobPicks(character) > 0;

    return (
        <button
            type="button"
            className={`team-card${selected ? ' pixel-cell--selected' : ''}`}
            onClick={onClick}
        >
            <div className="battle-card-sprite">
                {pending ? <span className="team-card-badge" title="Level up available">↑</span> : null}
                {idle ? (
                    <div
                        className="battle-card-sprite-layer battle-card-sprite-layer--idle"
                        style={{ backgroundImage: `url(${idle})` }}
                    />
                ) : (
                    <span className="battle-card-icon">{'👤'}</span>
                )}
            </div>
            <span className="team-card-name">{character.name}</span>
            <span className="team-card-job">{jobLine}</span>
        </button>
    );
}
