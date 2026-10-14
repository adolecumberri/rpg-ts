import type { Character, Item } from '@rpg';
import { heldJobOf, loadoutOf } from '@core';
import { portraitIdOf, portraitUrl } from '../../constants/portraits';
import { Icon } from '../chrome/Icon';
import { StatBar } from '../chrome/StatBar';
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

    console.log("hola", character.stats.mana);

    return (
        <>
            <div className="team-data-head">
                <div className="team-data-portrait-wrap">
                    <span className="team-data-portrait-name">{character.name}</span>
                    <img className="team-data-portrait" src={portraitUrl(portraitIdOf(character))} alt={character.name} />
                </div>
                <div className="team-data-identity">
                    <span style={{ color: 'var(--muted)', marginBottom: "var(--s2)" }}>
                        <div style={{ position: "absolute", }}>
                            {/* <Icon id="default" size={4} /> */}
                            {jobLine}
                        </div>
                        <StatBar
                            // value={experience.currentXp}
                            value={50}
                            max={experience.getXpToNextLevel()}
                            type="xp"
                            width={100}
                            height={8}
                        />

                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <span className="team-data-lv" >Lv. {experience.level}</span>
                        <div>
                            <div style={{ position: "absolute" }}>
                                <span className="team-data-lv" style={{ color: '#e86020' }} >EXP. </span>{experience.currentXp}
                            </div>
                            <StatBar
                                // value={experience.currentXp}
                                value={50}
                                max={experience.getXpToNextLevel()}
                                type="xp"
                                width={68}
                                height={8}
                            />
                        </div>
                    </div>
                    <div style={{
                        display: "flex",
                        alignItems: "center"
                    }}>
                        <div style={{ minWidth: "60px" }}>
                            <span className="team-data-hp" >HP. </span> {Math.round(character.getStat('hp'))}/{Math.round(character.getStat('totalHp'))}
                        </div>
                        <StatBar
                            value={Math.round(character.getStat('hp'))}
                            max={Math.round(character.getStat('totalHp'))}
                            type="hp"
                            width={80}
                            height={5}
                        />
                    </div>
                    <div style={{
                        display: "flex",
                        alignItems: "center"
                    }}>
                        <div style={{ minWidth: "60px" }}>
                            <span className="team-data-mp" >MP</span> {Math.round(character.stats.mana ?? 0)}/{Math.round(character.stats.totalMana ?? 0)}
                        </div>
                        <StatBar
                            value={Math.round(character.stats.mana ?? 0)}
                            max={Math.round(character.stats.totalMana ?? 0)}
                            type="mana"
                            width={80}
                            height={5}
                        />
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
        </>
    );
}
