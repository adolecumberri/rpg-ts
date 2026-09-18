import type { EquipmentSlot } from '@rpg/classes/items/EquipmentManager';
import { characterElementsSummary, DEFAULT_ELEMENTS } from '@core';
import { useGame } from '../game/GameContext';
import { CharacterCard } from '../components/CharacterCard';

const SLOTS: { slot: EquipmentSlot; label: string }[] = [
    { slot: 'weapon', label: 'Weapon' },
    { slot: 'armor', label: 'Armor' },
    { slot: 'accessory', label: 'Accessory' },
];

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

    return (
        <div className="screen">
            <CharacterCard character={character} />

            <div className="card">
                <div className="section-title">Equipment</div>
                {SLOTS.map(({ slot, label }) => {
                    const item = character.equipment.get(slot);
                    return (
                        <div key={slot} className="stat-row">
                            <span className="label">{label}</span>
                            <span style={{ flex: 1, color: item ? 'var(--text)' : 'var(--muted)' }}>
                                {item ? item.name : 'Empty'}
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
                                    <span style={{ flex: 1, color: 'var(--muted)' }}>
                                        {entry.converted ? 'converted attack' : 'bonus damage'}
                                    </span>
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
