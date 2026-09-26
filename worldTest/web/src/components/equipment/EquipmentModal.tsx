import type { Character } from '@rpg';
import type { EquipmentSlot } from '@rpg/classes/items/EquipmentManager';
import { itemStatsText, heldJobOf } from '@core';
import { useGame } from '../../game/GameContext';

/**
 * The equipment picker for one slot: every copy the shared inventory
 * owns that fits the slot, with the item's stats under its name.
 * Weapons the character's Job cannot wield are shown but disabled.
 */
export function EquipmentModal({
    character,
    slot,
    onClose,
}: {
    character: Character;
    slot: EquipmentSlot;
    onClose: () => void;
}) {
    const api = useGame();
    const job = heldJobOf(character);

    // Owned = the inventory knows the item (equipped copies stay owned).
    const candidates = api.team.inventory
        .getAllItems()
        .filter((entry) => entry.item.definition.slot === slot && entry.totalQuantity > 0);

    const equippedId = character.equipment.get(slot)?.id;

    return (
        <>
            <div className="messagebox-overlay" onClick={onClose} />
            <div className="modal-card">
                <button
                    type="button"
                    className="modal-close"
                    aria-label="Close"
                    onClick={onClose}
                >
                    ✕
                </button>
                <h2 style={{ margin: '0 0 2px' }}>{character.name}</h2>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>
                    Owned equipment · {slot}
                </div>

                {candidates.length === 0 ? (
                    <div className="empty" style={{ padding: 14 }}>
                        You own nothing for this slot.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
                        {candidates.map((entry) => {
                            const item = entry.item;
                            const equippedHere = item.id === equippedId;
                            const allowed = job ? job.allowsWeapon(item.definition.weaponType) : true;
                            const available = entry.quantity > 0;
                            const disabled = !allowed || (!available && !equippedHere);

                            return (
                                <div
                                    key={item.id}
                                    className="menu-item"
                                    style={{
                                        opacity: disabled ? 0.55 : 1,
                                        flexDirection: 'column',
                                        alignItems: 'stretch',
                                        cursor: disabled ? 'default' : 'pointer',
                                    }}
                                    onClick={() => {
                                        if (disabled) return;
                                        if (equippedHere) {
                                            const ok = api.session.unequipFrom(character.id, slot);
                                            api.refresh();
                                            api.showToast(ok ? `Unequipped ${item.name}.` : 'Nothing to unequip.');
                                        } else {
                                            api.equipTo(item.id, character.id);
                                            api.refresh();
                                            api.showToast(`Equipped ${item.name}.`);
                                        }
                                        onClose();
                                    }}
                                >
                                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                                        <span className="tag">
                                            {equippedHere ? 'Equipped' : `${entry.quantity}/${entry.totalQuantity} owned`}
                                        </span>
                                    </span>
                                    <span style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.45 }}>
                                        {itemStatsText(item)}
                                    </span>
                                    {!allowed && job ? (
                                        <span style={{ color: 'var(--warn, #e0a458)', fontSize: 12 }}>
                                            ✋ {job.title}s cannot wield this weapon.
                                        </span>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ marginTop: 12, textAlign: 'center' }}>
                    <button className="btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </>
    );
}
