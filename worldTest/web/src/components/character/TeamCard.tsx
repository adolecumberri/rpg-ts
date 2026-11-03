import type { Character, Item } from '@rpg';
import { heldJobOf, jobLevelOf, loadoutOf, pendingJobPicks } from '@core';
import { portraitIdOf, portraitUrl } from '../../constants/portraits';
import { Icon } from '../chrome';

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
    const experience = character.experience;

    const loadout = loadoutOf(character);
    const lines: Array<{ key: string; icon: string; item?: Item }> = loadout.holes.map((item, index) => ({
        key: `hole_${index}`,
        icon: item?.definition.icon ?? 'default',
        item,
    }));
    return (
        <button
            type="button"
            className={`team-card${selected ? ' is-selected' : ''}`}
            onClick={onClick}
        >
            {pending ? <span className="team-card-badge" title="Level up available">↑</span> : null}
            <div className="team-data-portrait-wrap">
                <span className="team-data-portrait-name">{character.name}</span>
                <img className="team-card-portrait" src={portraitUrl(portraitIdOf(character))} alt={character.name} />
            </div>
            <div className="team-data-identity">
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="team-data-lv" >Lv. {experience.level}</span>

                </div>

                <span style={{ color: 'var(--muted)', marginBottom: 'var(--s2)' }}>
                    <div style={{ position: 'absolute' }}>
                        {/* <Icon id="default" size={4} /> */}
                        {jobLine}
                    </div>
                    {/* <StatBar
                        // value={experience.currentXp}
                        value={jobXpInLevelOf(character)}
                        max={100}
                        type="xp"
                        width={100}
                        height={8}
                    /> */}

                </span>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                }}>
                    <div style={{ minWidth: '60px' }}>
                        <span className="team-data-hp">HP. </span>{' '}
                        {Math.round(character.getStat('hp'))}/{Math.round(character.getStat('totalHp'))}
                    </div>

                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                }}>
                    <div style={{ minWidth: '60px' }}>
                        <span className="team-data-mp">MP</span>{' '}
                        {Math.round(character.stats.mana ?? 0)}/{Math.round(character.stats.totalMana ?? 0)}
                    </div>

                </div>

                <div>
                    {lines.map((line) => (

                        <Icon id={line.icon} size={4} />

                    ))}
                </div>

            </div>
        </button>
    );
}
