import type { Character, Item } from '@rpg';
import { JOB_ICONS, heldJobOf, loadoutOf } from '@core';
import { portraitUrl } from '../../constants/portraits';

type StatKey =
    | 'attack'
    | 'defence'
    | 'magicDefence'
    | 'speed'
    | 'magic'
    | 'critChance'
    | 'critMultiplier';

const STATS: Array<{
    icon: string;
    label: string;
    stat: StatKey;
    suffix?: string;
    prefix?: string;
}> = [
    { icon: '⚔️', label: 'Atq. físico', stat: 'attack' },
    { icon: '🛡️', label: 'Def. física', stat: 'defence' },
    { icon: '🔮', label: 'Def. mágica', stat: 'magicDefence' },
    { icon: '⚡', label: 'Rapidez', stat: 'speed' },
    { icon: '✨', label: 'Poder mágico', stat: 'magic' },
    { icon: '🎯', label: 'Crit.', stat: 'critChance', suffix: '%' },
    { icon: '💥', label: 'Crit. Mult.', stat: 'critMultiplier', prefix: '×' },
];

// Slot icons stand in for the item art until real item icons exist.

/**
 * The selected character's data panel: the name overlaid on a
 * borderless portrait, Lv/job/HP/XP to its right, and the attribute
 * list as icon + name + number lines — the number gets a fixed width
 * (--s5) and the name takes the rest, right-aligned against it. Pure
 * presentation; the page owns the selection and the bar below.
 */
export function TeamData({ character }: { character: Character }) {
    const job = heldJobOf(character);
    const jobLine = job ? `${JOB_ICONS[job.id] ?? ''} ${job.title}` : 'The Player';
    const experience = character.experience;
    const loadout = loadoutOf(character);
    // The five slots (two accessory holes) as display lines; the slot
    // icons stand in until real item icons exist.
    const lines: Array<{ key: string; icon: string; item?: Item }> = [
        { key: 'weapon', icon: '⚔️', item: loadout.weapon },
        { key: 'offhand', icon: '🛡️', item: loadout.offhand },
        { key: 'helmet', icon: '⛑️', item: loadout.helmet },
        { key: 'clothes', icon: '👕', item: loadout.clothes },
        { key: 'accessory_0', icon: '📿', item: loadout.accessories[0] },
        { key: 'accessory_1', icon: '📿', item: loadout.accessories[1] },
    ];

    return (
        <div className="pixel-panel team-data">
            <div className="team-data-head">
                <div className="team-data-portrait-wrap">
                    <span className="team-data-portrait-name">{character.name}</span>
                    <img className="team-data-portrait" src={portraitUrl()} alt={character.name} />
                </div>
                <div className="team-data-identity">
                    <div style={{ fontSize: 'var(--s3)' }}>
                        <span className="team-data-lv">Lv. {experience.level}</span>
                        <span style={{ color: 'var(--muted)' }}>{jobLine}</span>
                    </div>
                    <div style={{ fontSize: 'var(--s3)' }}>
                        ❤️ {Math.round(character.getStat('hp'))}/{Math.round(character.getStat('totalHp'))}
                    </div>
                    <div style={{ fontSize: 'var(--s3)' }}>⭐ XP {experience.currentXp}</div>
                </div>
            </div>
            <div className="team-data-split">
                <div className="team-data-stats">
                    {STATS.map((entry) => (
                        <div key={entry.stat} className="team-stat-line">
                            <span className="team-stat-icon">{entry.icon}</span>
                            <span className="team-stat-name">{entry.label}</span>
                            <span className="team-stat-value">
                                {entry.prefix ?? ''}{Math.round(character.getStat(entry.stat))}{entry.suffix ?? ''}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="team-data-side">
                    <div className="team-data-block">
                        <div className="team-data-block-title">Equipment</div>
                        {lines.map((line) => (
                            <div key={line.key} className="equip-line">
                                <span className="inv-item-icon">{line.icon}</span>
                                <span className={line.item ? 'equip-line-item' : 'equip-line-empty'}>
                                    {line.item ? line.item.name : 'Empty'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
