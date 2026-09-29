import { useState } from 'react';
import type { Item } from '@rpg';
import type { EquipmentSlot } from '@rpg/classes/items/EquipmentManager';
import {
    ALL_JOBS,
    GROWTH_STAT_LABELS,
    JOB_ICONS,
    characterElementsSummary,
    DEFAULT_ELEMENTS,
    growthRowsOf,
    itemStatsSummary,
    jobBonusText,
    jobIdOf,
    jobNameOf,
    heldJobOf,
    specOf,
} from '@core';
import type { SkillSpec } from '@core';
import { useGame } from '../game/GameContext';
import { CharacterCard } from '../components/CharacterCard';
import { EquipmentModal } from '../components/equipment/EquipmentModal';
import { TOAST_MS } from '../constants/toast';

const SLOTS: { slot: EquipmentSlot; label: string }[] = [
    { slot: 'weapon', label: 'Weapon' },
    { slot: 'armor', label: 'Armor' },
    { slot: 'accessory', label: 'Accessory' },
    { slot: 'bag', label: 'Bag' },
];

const STAT_HINTS: Record<string, string> = {
    'Atq. físico': 'Atq. físico: the base physical damage of your hits.',
    'Def. física': 'Def. física: mitigates physical damage with 50/(50+defence).',
    'Def. mágica': 'Def. mágica: mitigates magical damage with 50/(50+magicDefence).',
    'Rapidez': 'Rapidez: acts earlier in the round, and more often in the interval battle.',
    'Poder mágico': 'Poder mágico: added to every magical damage component of your attacks.',
    'Crit.': 'Crit.: percent chance that a physical hit becomes a crit.',
    'Crit. Mult.': 'Crit. Mult.: how much a crit multiplies the damage (×2).',
};

export function CharacterScreen({ characterId }: { characterId: string }) {
    const api = useGame();
    // Roster-only characters (camp recruits outside the party) are
    // viewable too.
    const character =
        api.team.getCharacter(characterId) ?? api.session.roster.character(characterId);

    // Which slot's item previews its stats in the left column (hover/focus),
    // and which slot opened the equipment picker modal.
    const [previewSlot, setPreviewSlot] = useState<EquipmentSlot | null>(null);
    const [modalSlot, setModalSlot] = useState<EquipmentSlot | null>(null);

    if (!character) {
        return (
            <div className="screen">
                <div className="empty">Character not found.</div>
                <button className="btn" onClick={() => api.back()}>Back</button>
            </div>
        );
    }

    const statuses = Array.from(character.statusManager.statuses.values());
    const elements = characterElementsSummary(character);
    const skills = api.session.availableSkillIds(character)
        .map((id) => specOf(id))
        .filter((spec): spec is SkillSpec => Boolean(spec));

    const stats = [
        { icon: '⚔️', label: 'Atq. físico', value: `${Math.round(character.getStat('attack'))}` },
        { icon: '🛡️', label: 'Def. física', value: `${Math.round(character.getStat('defence'))}` },
        { icon: '🔮', label: 'Def. mágica', value: `${Math.round(character.getStat('magicDefence'))}` },
        { icon: '⚡', label: 'Rapidez', value: `${Math.round(character.getStat('speed'))}` },
        { icon: '✨', label: 'Poder mágico', value: `${Math.round(character.getStat('magic'))}` },
        { icon: '🎯', label: 'Crit.', value: `${Math.round(character.getStat('critChance'))}%` },
        { icon: '💥', label: 'Crit. Mult.', value: `×${character.getStat('critMultiplier')}` },
    ];

    const heldJob = heldJobOf(character);

    const jobId = jobIdOf(characterId);
    const growthRows = growthRowsOf(jobId);

    const previewItem: Item | undefined =
        previewSlot !== null ? character.equipment.get(previewSlot) : undefined;

    return (
        <div className="screen">
            <CharacterCard character={character} />

            <div className="card">
                <div className="equipment-split">
                    <div>
                        <div className="section-title">
                            {previewSlot !== null
                                ? (previewItem ? previewItem.name : `${previewSlot} · Empty`)
                                : 'Stats'}
                        </div>
                        {previewSlot === null ? (
                            <div className="stat-grid">
                                {stats.map((stat) => (
                                    <div
                                        key={stat.label}
                                        className="stat-cell"
                                        title={STAT_HINTS[stat.label] ?? stat.label}
                                        onClick={() => api.showToast(STAT_HINTS[stat.label] ?? stat.label, TOAST_MS.help)}
                                    >
                                        <span className="stat-cell-icon">{stat.icon}</span>
                                        <span className="stat-cell-value">{stat.value}</span>
                                        <span className="stat-cell-label">{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                        ) : previewItem ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {itemStatsSummary(previewItem).length === 0 ? (
                                    <div className="empty" style={{ padding: 10 }}>No stat bonuses.</div>
                                ) : (
                                    itemStatsSummary(previewItem).map((line, index) => (
                                        <div key={index} className="stat-row">
                                            <span className="label">{line.icon}</span>
                                            <span style={{ flex: 1 }}>{line.text}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="empty" style={{ padding: 10 }}>
                                Nothing equipped here. Tap the slot to choose an item.
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="section-title">Equipment</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {SLOTS.map(({ slot, label }) => {
                                const item = character.equipment.get(slot);
                                return (
                                    <div
                                        key={slot}
                                        role="button"
                                        tabIndex={0}
                                        className={`equipment-slot-row${previewSlot === slot ? ' equipment-slot-row--focused' : ''}`}
                                        onMouseEnter={() => setPreviewSlot(slot)}
                                        onMouseLeave={() => setPreviewSlot(null)}
                                        onFocus={() => setPreviewSlot(slot)}
                                        onBlur={() => setPreviewSlot(null)}
                                        onClick={() => setModalSlot(slot)}
                                    >
                                        <span className="label">{label}</span>
                                        <span
                                            style={{
                                                flex: 1,
                                                color: item ? 'var(--text)' : 'var(--muted)',
                                                fontStyle: item ? 'normal' : 'italic',
                                            }}
                                        >
                                            {item ? item.name : 'Empty'}
                                        </span>
                                        <span className="equipment-slot-chevron">›</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 6 }}>
                            Hover an item to preview its stats · tap to change
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="section-title">Job</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ALL_JOBS.map((job) => {
                        const held = heldJob?.id === job.id;
                        return (
                            <div
                                key={job.id}
                                role="button"
                                tabIndex={0}
                                className={`equipment-slot-row${held ? ' equipment-slot-row--focused' : ''}`}
                                onClick={() => {
                                    const result = api.session.setJob(characterId, job.id);
                                    api.refresh();
                                    api.showToast(result.message);
                                }}
                            >
                                <span className="label">{JOB_ICONS[job.id] ?? '👤'} {job.title}</span>
                                <span style={{ flex: 1, color: 'var(--muted)', fontSize: 12 }}>
                                    {jobBonusText(job)} · {job.weaponTypes.join(' / ') || 'any weapon'}
                                </span>
                                {held ? <span className="tag">Current</span> : null}
                            </div>
                        );
                    })}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 6 }}>
                    Swapping jobs updates the stat bonuses and unequips weapons the new job cannot wield.
                </div>
            </div>

            <div className="card">
                <div className="section-title">Growth · {jobNameOf(jobId)}</div>
                {growthRows.map((row) => (
                    <div key={row.stat} className="stat-row">
                        <span className="label">{row.icon} {GROWTH_STAT_LABELS[row.stat]}</span>
                        <span style={{ flex: 1, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                            {row.base} → {row.target}
                        </span>
                        <span className="tag">{row.ratioPercent}% of cap {row.cap}</span>
                    </div>
                ))}
            </div>

            {elements.attack.length > 0 || elements.defence.length > 0 ? (
                <div className="card">
                    <div className="section-title">Elements</div>
                    {elements.attack.length > 0 ? (
                        <div style={{ marginBottom: 6 }}>
                            <div className="section-title" style={{ fontSize: 11, margin: '4px 0 2px' }}>Attack enhancement</div>
                            {elements.attack.map((entry, index) => (
                                <div key={index} className="stat-row">
                                    <span className="label">
                                        {DEFAULT_ELEMENTS.get(entry.element)?.icon ?? '✨'}{' '}
                                        {DEFAULT_ELEMENTS.get(entry.element)?.name ?? entry.element}
                                    </span>
                                    <span style={{ flex: 1, color: 'var(--muted)' }}>{entry.kind} bonus damage</span>
                                    <span className="value">+{Math.round(entry.amount)}</span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                    {elements.defence.length > 0 ? (
                        <div>
                            <div className="section-title" style={{ fontSize: 11, margin: '4px 0 2px' }}>Defence resistances</div>
                            {elements.defence.map((entry, index) => (
                                <div key={index} className="stat-row">
                                    <span className="label">
                                        {DEFAULT_ELEMENTS.get(entry.element)?.icon ?? '✨'}{' '}
                                        {DEFAULT_ELEMENTS.get(entry.element)?.name ?? entry.element}
                                    </span>
                                    <span style={{ flex: 1, color: 'var(--muted)' }}>
                                        {entry.multiplier !== 1
                                            ? `×${entry.multiplier} affinity`
                                            : `resist ${Math.round(entry.reduction)}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className="card">
                <div className="section-title">Skills</div>
                {skills.length === 0 ? (
                    <div className="empty" style={{ padding: 10 }}>No skills yet.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {skills.map((skill) => (
                            <div key={skill.id}>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{skill.name}</div>
                                <div style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.45 }}>{skill.description}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="card">
                <div className="section-title">Status Effects</div>
                {statuses.length === 0 ? (
                    <div className="empty" style={{ padding: 10 }}>None</div>
                ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {statuses.map((status) => (
                            <span key={status.id} className="pill">{status.definition.name}</span>
                        ))}
                    </div>
                )}
            </div>

            <div className="btn-row">
                <button className="btn" onClick={() => api.navigate({ name: 'skilltree', characterId })}>🌳 Skill Tree</button>
                <button className="btn" onClick={() => api.back()}>Back</button>
            </div>

            {modalSlot !== null ? (
                <EquipmentModal
                    character={character}
                    slot={modalSlot}
                    onClose={() => setModalSlot(null)}
                />
            ) : null}
        </div>
    );
}
