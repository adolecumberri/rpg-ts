import { useState } from 'react';
import type { Character, Item } from '@rpg';
import {
    canEquipItem,
    equipFromInventory,
    loadoutOf,
    sectionOfItem,
    sectionsForSlot,
    unequipToInventory,
} from '@core';
import type { EquipmentSection, LoadoutSlot } from '@core';
import { useGame } from '../game/GameContext';
import { OptionsBar } from '../components/UI/OptionsBar';
import { Modal } from '../components/UI/Modal';
import { TeamCard } from '../components/UI/TeamCard';
import { TeamData } from '../components/UI/TeamData';

// The five loadout slots as bar options, with their picker sections.
const SLOT_OPTIONS: Array<{ slot: LoadoutSlot; label: string; icon: string }> = [
    { slot: 'weapon', label: 'Arma', icon: '⚔️' },
    { slot: 'offhand', label: 'Brazos', icon: '🛡️' },
    { slot: 'helmet', label: 'Casco', icon: '⛑️' },
    { slot: 'clothes', label: 'Ropa', icon: '👕' },
    { slot: 'accessory', label: 'Accesorios', icon: '📿' },
];

const SECTION_META: Record<EquipmentSection, { label: string; icon: string }> = {
    espadas: { label: 'Espadas', icon: '⚔️' },
    varas: { label: 'Varas', icon: '✨' },
    arcos: { label: 'Arcos', icon: '🏹' },
    cascos: { label: 'Cascos', icon: '⛑️' },
    ropa: { label: 'Ropa', icon: '👕' },
    escudos: { label: 'Escudos', icon: '🛡️' },
    accesorios: { label: 'Accesorios', icon: '📿' },
};

/**
 * The team page (new UI, FFT A2 style): the squad grid, the selected
 * character's data, and the equipment flow — Equipo opens the five-slot
 * view whose bar carries the slot options (back pinned at the 5th
 * place); picking a slot opens the item picker modal, one section per
 * tab page, with the job/character restrictions applied.
 */
export function TeamPage({ onBack }: { onBack?: () => void }) {
    const api = useGame();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [statusModal, setStatusModal] = useState(false);
    const [equipView, setEquipView] = useState(false);
    const [equipSlot, setEquipSlot] = useState<LoadoutSlot | null>(null);
    const [pickerSection, setPickerSection] = useState<EquipmentSection>('espadas');

    const activeIds = api.session.roster.activeIds();
    const members = activeIds
        .map((id) => api.session.roster.character(id))
        .filter((character): character is Character => Boolean(character));
    const selected = selectedId ? members.find((entry) => entry.id === selectedId) : undefined;

    const loadout = selected ? loadoutOf(selected) : undefined;
    const loadoutLines: Array<{ key: string; icon: string; item?: Item }> = loadout ? [
        { key: 'weapon', icon: '⚔️', item: loadout.weapon },
        { key: 'offhand', icon: '🛡️', item: loadout.offhand },
        { key: 'helmet', icon: '⛑️', item: loadout.helmet },
        { key: 'clothes', icon: '👕', item: loadout.clothes },
        { key: 'accessory_0', icon: '📿', item: loadout.accessories[0] },
        { key: 'accessory_1', icon: '📿', item: loadout.accessories[1] },
    ] : [];

    const statuses = selected ?
        Array.from(selected.statusManager.statuses.values()) :
        [];

    const openSlotPicker = (slot: LoadoutSlot) => {
        const sections = sectionsForSlot(slot);
        setPickerSection(sections[0]);
        setEquipSlot(slot);
    };

    const pickItem = (itemId: string) => {
        if (!selected || !equipSlot) return;
        const result = equipFromInventory(api.team, selected, itemId);
        api.refresh();
        api.showToast(result.message);
        if (result.ok) setEquipSlot(null);
    };

    const unequipCurrent = () => {
        if (!selected || !equipSlot) return;
        const result = unequipToInventory(api.team, selected, equipSlot);
        api.refresh();
        api.showToast(result.message);
        if (result.ok) setEquipSlot(null);
    };

    // The picker lists the bag items of the current section (one section
    // per page), disabled when the policy refuses them.
    const bagSlots = api.team.inventory.getAllItems();
    const pickerSlots = bagSlots.filter(
        (slot) => slot.quantity > 0 && sectionOfItem(slot.item) === pickerSection,
    );
    const pickerSections = equipSlot ? sectionsForSlot(equipSlot) : [];
    const slotHasItem = selected && equipSlot && loadout ?
        loadoutLines.some(
            (line) => line.item && line.key === equipSlot,
        ) :
        false;

    const content = selected ? (
        equipView ? (
            <div className="pixel-panel">
                <div className="pixel-title">Equipo · {selected.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)' }}>
                    {loadoutLines.map((line) => (
                        <div key={line.key} className="equip-line">
                            <span className="inv-item-icon">{line.icon}</span>
                            <span className={line.item ? 'equip-line-item' : 'equip-line-empty'}>
                                {line.item ? line.item.name : 'Empty'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <TeamData character={selected} />
        )
    ) : (
        <>
            <div className="pixel-panel">
                <div className="pixel-title">The Squad</div>
                <div style={{ fontSize: 'var(--s3)', color: 'var(--muted)' }}>
                    Tap a character to open their data.
                </div>
            </div>
            <div className="team-grid">
                {members.map((character) => (
                    <TeamCard
                        key={character.id}
                        character={character}
                        selected={character.id === selectedId}
                        onClick={() => setSelectedId(character.id)}
                    />
                ))}
            </div>
        </>
    );

    const bar = selected && !equipView ? (
        <OptionsBar
            size="lg"
            options={[
                {
                    id: 'equipment',
                    label: 'Equipo',
                    icon: '🎒',
                    onClick: () => setEquipView(true),
                },
                {
                    id: 'status',
                    label: 'Estatus',
                    icon: '✨',
                    onClick: () => setStatusModal(true),
                },
                {
                    id: 'job',
                    label: 'Oficio',
                    icon: '👤',
                    onClick: () => api.showToast('The Jobs page is coming soon.'),
                },
            ]}
            back={{ label: 'Atrás', onClick: () => setSelectedId(null) }}
        />
    ) : selected && equipView ? (
        <OptionsBar
            size="lg"
            options={SLOT_OPTIONS.map((entry) => ({
                id: entry.slot,
                label: entry.label,
                icon: entry.icon,
                onClick: () => openSlotPicker(entry.slot),
            }))}
            back={{ label: 'Atrás', onClick: () => setEquipView(false) }}
        />
    ) : (
        <OptionsBar
            size="lg"
            options={[]}
            back={onBack ? { label: 'Back', onClick: onBack } : undefined}
        />
    );

    return (
        <div className="pixel-font" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="newui-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {content}
            </div>

            {bar}

            <Modal title="Estatus" open={statusModal} onClose={() => setStatusModal(false)}>
                {statuses.length === 0 ? (
                    <div style={{ fontSize: 'var(--s3)', color: 'var(--muted)' }}>No active statuses.</div>
                ) : (
                    <div>
                        {statuses.map((status) => (
                            <div key={status.id} className="status-row">
                                <div className="status-name">{status.definition.name}</div>
                                {status.definition.description ? (
                                    <div className="status-desc">{status.definition.description}</div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            <Modal
                title={equipSlot ? SLOT_OPTIONS.find((entry) => entry.slot === equipSlot)?.label ?? '' : ''}
                size="lg"
                open={equipSlot !== null}
                onClose={() => setEquipSlot(null)}
            >
                {equipSlot ? (
                    <>
                        <div className="inv-tabs">
                            {pickerSections.map((section) => {
                                const meta = SECTION_META[section];
                                return (
                                    <button
                                        key={section}
                                        type="button"
                                        title={meta.label}
                                        aria-label={meta.label}
                                        className={`inv-tab pixel-btn${pickerSection === section ? ' pixel-btn--primary' : ''}`}
                                        onClick={() => setPickerSection(section)}
                                    >
                                        {meta.icon}
                                    </button>
                                );
                            })}
                        </div>
                        {pickerSlots.length === 0 ? (
                            <div style={{ fontSize: 'var(--s3)', color: 'var(--muted)' }}>
                                Nothing of this section in the bag.
                            </div>
                        ) : (
                            <div>
                                {pickerSlots.map((slot) => {
                                    const allowed = selected ?
                                        canEquipItem(selected, slot.item) :
                                        { ok: false, message: '' };
                                    return (
                                        <div key={slot.id} className="inv-item-row">
                                            <span className="inv-item-icon" />
                                            <span className="inv-item-info">
                                                <span className="inv-item-name">{slot.item.name}</span>
                                                <span className="inv-item-values">Tienes {slot.quantity}</span>
                                            </span>
                                            <button
                                                type="button"
                                                className="pixel-btn"
                                                title={allowed.ok ? undefined : allowed.message}
                                                style={{
                                                    height: 'var(--s8)',
                                                    ...(!allowed.ok ? { opacity: 0.5 } : {}),
                                                }}
                                                disabled={!allowed.ok}
                                                onClick={() => pickItem(slot.item.id)}
                                            >
                                                Equip
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {slotHasItem ? (
                            <div style={{ marginTop: 'var(--s2)' }}>
                                <button
                                    type="button"
                                    className="pixel-btn pixel-btn--danger"
                                    onClick={unequipCurrent}
                                >
                                    Unequip
                                </button>
                            </div>
                        ) : null}
                    </>
                ) : null}
            </Modal>
        </div>
    );
}
