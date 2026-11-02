import type { Character } from '@rpg';
import { heldJobOf, pendingJobPicks } from '@core';
import { SPRITES, spriteRoleOf } from '../../assets/sprites';
import { SPRITE_BOX, spriteBoxStyle, spriteScaleFor, useSpriteFrames } from '../../assets/spriteFrames';

/**
 * One squad card on the team page: the character's idle sprite, name
 * and job line. Purely presentational — the page owns the selection.
 * A gold ↑ badge marks a pending job level up (an enhancement pick
 * waiting for the player). The idle loop steps the frames from the
 * sprite data (frame size/count/timing), never from a hardcoded sheet.
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
    const set = role ? SPRITES[role] : undefined;
    const idle = useSpriteFrames(set?.idle, {
        scale: set ? spriteScaleFor(SPRITE_BOX.squadCard, set.idle) : 1,
    });
    const jobLine = job ? ` ${job.title}` : 'The Player';
    const pending = pendingJobPicks(character) > 0;

    return (
        <button
            type="button"
            className={`team-card${selected ? ' is-selected' : ''}`}
            onClick={onClick}
        >
            <div className="battle-card-sprite" style={spriteBoxStyle(set?.idle, SPRITE_BOX.squadCard)}>
                {pending ? <span className="team-card-badge" title="Level up available">↑</span> : null}
                {set ? (
                    <div
                        className="battle-card-sprite-layer battle-card-sprite-layer--idle"
                        style={idle.style}
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
