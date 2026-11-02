import type { Character } from '@rpg';
import { heldJobOf, jobLevelOf, pendingJobPicks } from '@core';
import { SPRITES, spriteRoleOf } from '../../assets/sprites';
import { SPRITE_BOX, spriteBoxStyle, spriteScaleFor, useSpriteFrames } from '../../assets/spriteFrames';

/**
 * One squad card on the team page: a 2-column card with the character's
 * idle sprite on the left (64 px box) and, on the right, the identity
 * column — name, job + job level, character level. Purely presentational:
 * the page owns the selection. A gold ↑ badge on the card corner marks a
 * pending job level up (an enhancement pick waiting for the player). The
 * idle loop steps the frames from the sprite data, never from a
 * hardcoded sheet.
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
    const jobLine = job ? `${job.title} · Lv ${jobLevelOf(character, job.id)}` : 'The Player';
    const pending = pendingJobPicks(character) > 0;

    return (
        <button
            type="button"
            className={`team-card${selected ? ' is-selected' : ''}`}
            onClick={onClick}
        >
            {pending ? <span className="team-card-badge" title="Level up available">↑</span> : null}
            <div
                className="battle-card-sprite team-card-sprite"
                style={{ ...spriteBoxStyle(set?.idle, SPRITE_BOX.squadCard), flex: 'none' }}
            >
                {set ? (
                    <div
                        className="battle-card-sprite-layer battle-card-sprite-layer--idle"
                        style={idle.style}
                    />
                ) : (
                    <span className="battle-card-icon">{'👤'}</span>
                )}
            </div>
            <div className="team-card-identity">
                <span className="team-card-identity-name">{character.name}</span>
                <span className="team-card-identity-job">{jobLine}</span>
                <span className="team-card-identity-level">Lv {character.experience.level}</span>
            </div>
        </button>
    );
}
