import type { EquipmentSlot } from '@rpg/classes/items/EquipmentManager';
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
                        </div>
                    );
                })}
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

            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
