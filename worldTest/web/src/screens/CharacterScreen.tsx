import type { EquipmentSlot } from '@rpg/classes/items/EquipmentManager';
import {
    GROWTH_STAT_LABELS,
    characterElementsSummary,
    DEFAULT_ELEMENTS,
    growthRowsOf,
    itemStatsText,
    jobIdOf,
    jobNameOf,
    specOf,
} from '@core';
import type { SkillSpec } from '@core';
import { useGame } from '../game/GameContext';
import { CharacterCard } from '../components/CharacterCard';
import { TOAST_MS } from '../constants/toast';

const SLOTS: { slot: EquipmentSlot; label: string }[] = [
    { slot: 'weapon', label: 'Weapon' },
    { slot: 'armor', label: 'Armor' },
    { slot: 'accessory', label: 'Accessory' },
    { slot: 'bag', label: 'Bag' },
];

const STAT_HINTS: Record<string, string> = {
    Attack: 'Attack: the base physical damage of your hits.',
    Defence: 'Defence: mitigates physical damage with 50/(50+defence).',
    'Magic Def': 'Magic Defence: mitigates magical damage with 50/(50+magicDefence).',
    Speed: 'Speed: acts earlier in the round, and more often in the interval battle.',
    'Crit Chance': 'Crit Chance: percent chance that a physical hit becomes a crit.',
    'Crit Multiplier': 'Crit Multiplier: how much a crit multiplies the damage (×2).',
};

export function CharacterScreen({ characterId }: { characterId: string }) {
    const api = useGame();
    const character = api.team.getCharacter(characterId);

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
        { icon: '⚔️', label: 'Attack', value: `${Math.round(character.getStat('attack'))}` },
        { icon: '🛡️', label: 'Defence', value: `${Math.round(character.getStat('defence'))}` },
        { icon: '🔮', label: 'Magic Def', value: `${Math.round(character.getStat('magicDefence'))}` },
        { icon: '⚡', label: 'Speed', value: `${Math.round(character.getStat('speed'))}` },
        { icon: '🎯', label: 'Crit Chance', value: `${Math.round(character.getStat('critChance'))}%` },
        { icon: '💥', label: 'Crit Multiplier', value: `×${character.getStat('critMultiplier')}` },
    ];

    const jobId = jobIdOf(characterId);
    const growthRows = growthRowsOf(jobId);

    return (
        <div className="screen">
            <CharacterCard character={character} />

            <div className="card">
                <div className="section-title">Stats</div>
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

            <div className="card">
                <div className="section-title">Equipment</div>
                {SLOTS.map(({ slot, label }) => {
                    const item = character.equipment.get(slot);
                    return (
                        <div key={slot} className="stat-row" style={{ alignItems: 'flex-start' }}>
                            <span className="label" style={{ marginTop: 2 }}>{label}</span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ color: item ? 'var(--text)' : 'var(--muted)' }}>
                                    {item ? item.name : 'Empty'}
                                </span>
                                {item ? (
                                    <span style={{ display: 'block', color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
                                        {itemStatsText(item)}
                                    </span>
                                ) : null}
                            </span>
                            {item ? (
                                <button
                                    className="btn"
                                    style={{ padding: '4px 10px', fontSize: 12, minWidth: 0, flex: 'none' }}
                                    onClick={() => {
                                        const ok = api.session.unequipFrom(characterId, slot);
                                        api.refresh();
                                        api.showToast(ok ? `Unequipped ${item.name}.` : 'Nothing to unequip.');
                                    }}
                                >
                                    Unequip
                                </button>
                            ) : null}
                        </div>
                    );
                })}
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
        </div>
    );
}
