import type { Character, Item } from '@rpg';
import { heldJobOf, loadoutOf } from '@core';
import { portraitUrl } from '../../constants/portraits';
import { Icon } from './Icon';
import { StatsColumn } from './StatsColumn';
import type { StatRow } from './StatsColumn';
import { STAT_CATALOG } from '../../game/statCatalog';

/**
 * The selected character's data panel: the name overlaid on a
 * borderless portrait, Lv/job/HP/XP to its right, and the attribute
 * list as icon + name + number lines — the number gets a fixed width
 * (--s5) and the name takes the rest, right-aligned against it. Pure
 * presentation; the page owns the selection and the bar below.
 */
export function TeamData({ character }: { character: Character }) {
    const job = heldJobOf(character);
    const jobLine = job ? job.title : 'The Player';
    const experience = character.experience;
    const loadout = loadoutOf(character);
    // The five holes: each shows its item (icon + name) or is empty.
    const lines: Array<{ key: string; icon: string; item?: Item }> = loadout.holes.map((item, index) => ({
        key: `hole_${index}`,
        icon: item?.definition.icon ?? 'default',
        item,
    }));
    // The character's totals as stats rows (the shared catalog order).
    const rows: StatRow[] = STAT_CATALOG.map((entry) => ({
        icon: entry.icon,
        label: entry.label,
        value: `${entry.prefix ?? ''}${Math.round(character.getStat(entry.key))}${entry.suffix ?? ''}`,
    }));

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
                        <span style={{ color: 'var(--muted)' }}>
                            <Icon id="default" size={4} /> {jobLine}
                        </span>
                    </div>
                    <div style={{ fontSize: 'var(--s3)' }}>
                        <Icon id="default" size={4} /> {Math.round(character.getStat('hp'))}/{Math.round(character.getStat('totalHp'))}
                    </div>
                    <div style={{ fontSize: 'var(--s3)' }}>
                        <Icon id="default" size={4} /> XP {experience.currentXp}
                    </div>
                </div>
            </div>
            <div className="team-data-split">
                <StatsColumn rows={rows} title="ESTADÍSTICAS" />
                <div className="team-data-side">
                    <div className="team-data-block">
                        <div className="team-data-block-title">Equipment</div>
                        {lines.map((line) => (
                            <div key={line.key} className="equip-line">
                                <span className="inv-item-icon">
                                    <Icon id={line.icon} size={4} />
                                </span>
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
