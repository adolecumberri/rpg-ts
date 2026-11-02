import type { Character } from '@rpg';
import { heldJobOf, jobLevelOf, pendingJobPicks } from '@core';
import { portraitIdOf, portraitUrl } from '../../constants/portraits';

/**
 * One squad card: the character's portrait (the story picture, framed like
 * the data panel's portrait) on the left and, on the right, the identity
 * column — name, job + job level, character level. Purely presentational:
 * the page owns the selection. A gold ↑ badge on the card corner marks a
 * pending job level up (an enhancement pick waiting for the player).
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
    const jobLine = job ? `${job.title} · Lv ${jobLevelOf(character, job.id)}` : 'The Player';
    const pending = pendingJobPicks(character) > 0;

    return (
        <button
            type="button"
            className={`team-card${selected ? ' is-selected' : ''}`}
            onClick={onClick}
        >
            {pending ? <span className="team-card-badge" title="Level up available">↑</span> : null}
            <div className="team-card-portrait-wrap">
                <img
                    className="team-card-portrait"
                    src={portraitUrl(portraitIdOf(character))}
                    alt={character.name}
                />
            </div>
            <div className="team-card-identity">
                <span className="team-card-identity-name">{character.name}</span>
                <span className="team-card-identity-job">{jobLine}</span>
                <span className="team-card-identity-level">Lv {character.experience.level}</span>
            </div>
        </button>
    );
}
