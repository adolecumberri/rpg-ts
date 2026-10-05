import { useState } from 'react';
import type { Character, InventorySlot, Item } from '@rpg';
import {
    canEquipItem,
    equipFromInventory,
    equippedItemsOf,
    loadoutOf,
    sectionOfItem,
    unequipToInventory,
} from '@core';
import type { EquipmentSection } from '@core';
import { useGame } from '../game/GameContext';
import { EQUIP_MESSAGES, messageOf } from '../game/equipmentMessages';
import { statsOfItems } from '../game/equipmentStats';
import { OptionsBar } from '../components/UI/OptionsBar';
import { Modal } from '../components/UI/Modal';
import { TeamCard } from '../components/UI/TeamCard';
import { TeamData } from '../components/UI/TeamData';
import { Icon } from '../components/UI/Icon';
import { StatsColumn } from '../components/UI/StatsColumn';
import type { IconId } from '../components/UI/Icon';

// The bag modal shows every section as a tab page (one section each).
const ALL_SECTIONS: EquipmentSection[] = [
    'espadas',
    'varas',
    'arcos',
    'cascos',
    'ropa',
    'escudos',
    'accesorios',
];

const SECTION_META: Record<EquipmentSection, { label: string; icon: IconId }> = {
    espadas: { label: 'Armas de filo', icon: 'espada' },
    varas: { label: 'Armas contundentes', icon: 'vara' },
    arcos: { label: 'Armas arrojadizas', icon: 'arco' },
    cascos: { label: 'Protección cabeza', icon: 'casco' },
    ropa: { label: 'Protección torso', icon: 'armadura' },
    escudos: { label: 'Escudos', icon: 'escudo' },
    accesorios: { label: 'Accesorios', icon: 'default' },
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
    const [selectedHole, setSelectedHole] = useState<number | null>(null);
    const [pickerSection, setPickerSection] = useState<EquipmentSection>('espadas');
    // The item whose stats the column previews (tap a row to set it).
    const [previewItem, setPreviewItem] = useState<Item | null>(null);

    const activeIds = api.session.roster.activeIds();
    const members = activeIds
        .map((id) => api.session.roster.character(id))
        .filter((character): character is Character => Boolean(character));
    const selected = selectedId ? members.find((entry) => entry.id === selectedId) : undefined;

    const loadout = selected ? loadoutOf(selected) : undefined;
    // The five holes: each holds an item or nothing (Vacío). Any hole
    // may take any equipable item; the engine's kind limits validate.
    const holeRows: Array<{ key: string; hole: number; icon: string; item?: Item }> = (
        loadout ? loadout.holes : []
    ).map((item, index) => ({
        key: `hole_${index}`,
        hole: index,
        icon: item?.definition.icon ?? 'default',
        item,
    }));

    const statuses = selected ?
        Array.from(selected.statusManager.statuses.values()) :
        [];

    const openHolePicker = (hole: number) => {
        // If the hole already holds equipment, open its own section
        // (a helmet opens Protección cabeza); empty holes open Espadas.
        const item = loadout ? loadout.holes[hole] : undefined;
        setPickerSection(item ? (sectionOfItem(item) ?? 'espadas') : 'espadas');
        setPreviewItem(null);
        setSelectedHole(hole);
    };

    const pickItem = (bagSlot: InventorySlot) => {
        if (!selected || selectedHole === null) return;
        const result = equipFromInventory(api.team, selected, bagSlot.item.id, selectedHole);
        api.refresh();
        // No message on success: the item is equipped and the picker
        // closes instantly. Failures translate the engine's code.
        if (result.ok) {
            setSelectedHole(null);
            setPreviewItem(null);
            return;
        }
        api.showToast(messageOf(result.code));
    };

    const unequipCurrent = () => {
        if (!selected || selectedHole === null) return;
        const result = unequipToInventory(api.team, selected, selectedHole);
        api.refresh();
        if (result.ok) {
            setSelectedHole(null);
            setPreviewItem(null);
        } else {
            api.showToast(messageOf(result.code));
        }
    };

    // The bag lists every section as a tab page, disabled rows when the
    // policy refuses them. The item's own slot decides where it goes.
    const bagSlots = api.team.inventory.getAllItems();
    const pickerSlots = bagSlots.filter(
        (slot) => slot.quantity > 0 && sectionOfItem(slot.item) === pickerSection,
    );
    // The bag slot of the previewed item (the strip's Equip equips it).
    const previewSlot = previewItem ?
        bagSlots.find((slot) => slot.item.id === previewItem.id && slot.quantity > 0) :
        undefined;
    const slotHasItem = selected && selectedHole !== null && loadout ?
        Boolean(loadout.holes[selectedHole]) :
        false;

    // The stats column: with a hole's picker open it starts EMPTY and
    // fills with the tapped row's item; in the general equipment view
    // it shows the equipped items' bonuses.
    const equippedStats = selected ? statsOfItems(equippedItemsOf(selected)) : [];
    const statsRows = previewItem ?
        statsOfItems([previewItem]) :
        selectedHole !== null ? statsOfItems([]) : equippedStats;

    const content = selected ? (
        equipView ? (
            <div className="equip-view">
                {selectedHole !== null ? (
                    <div className="equip-picker">
                        <div className="pixel-modal-header">
                            <span className="pixel-modal-title">{SECTION_META[pickerSection].label}</span>
                            <div className="inv-tabs">
                                {ALL_SECTIONS.map((section) => {
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
                                            <Icon id={meta.icon} size={4} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="pixel-modal-body">
                            {pickerSlots.length === 0 ? (
                                <div style={{ fontSize: 'var(--s3)', color: 'var(--muted)' }}>
                                    {EQUIP_MESSAGES['no-copies']}
                                </div>
                            ) : (
                                <div>
                                    <div className="inv-table-head">
                                        <span className="inv-head-spacer" />
                                        <span className="inv-head-name">nombre</span>
                                        <span className="inv-head-count">en uso</span>
                                        <span className="inv-head-count">total</span>
                                    </div>
                                    {pickerSlots.map((slot) => {
                                        const allowed = selected ?
                                            canEquipItem(selected, slot.item) :
                                            { ok: false, message: '' };
                                        const inUse = slot.totalQuantity - slot.quantity;
                                        const isPreview = previewItem !== null && previewItem.id === slot.item.id;
                                        const rowClass = [
                                            'inv-item-row',
                                            allowed.ok ? '' : 'inv-item-row--disabled',
                                            isPreview ? 'inv-item-row--preview' : '',
                                        ].join(' ');
                                        return (
                                            <div
                                                key={slot.id}
                                                className={rowClass}
                                                onClick={() => setPreviewItem(slot.item)}
                                            >
                                                <span className="inv-item-icon">
                                                    <Icon id={slot.item.definition.icon ?? 'default'} size={4} />
                                                </span>
                                                <span className="inv-item-info">
                                                    <span className="inv-item-name">{slot.item.name}</span>
                                                </span>
                                                <span className="inv-count">{inUse}</span>
                                                <span className="inv-count">{slot.totalQuantity}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="equip-actions">
                            <button
                                type="button"
                                className="pixel-btn pixel-btn--danger"
                                disabled={!slotHasItem}
                                onClick={unequipCurrent}
                            >
                                Unequip
                            </button>
                            <button
                                type="button"
                                className="pixel-btn equip-go"
                                disabled={!previewSlot}
                                onClick={() => {
                                    if (previewSlot) pickItem(previewSlot);
                                }}
                            >
                                Equip
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="pixel-panel">
                        <div className="pixel-title">Equipo · {selected.name}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)' }}>
                            {holeRows.map((row) => (
                                <div key={row.key} className="equip-line">
                                    <span className="inv-item-icon">
                                        <Icon id={row.icon} size={4} />
                                    </span>
                                    <span className={row.item ? 'equip-line-item' : 'equip-line-empty'}>
                                        {row.item ? row.item.name : 'Vacío'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <StatsColumn rows={statsRows} title="ESTADÍSTICAS DEL PORTADOR" />
            </div>
        ) : (
            <TeamData character={selected} />
        )
    ) : (
        <>
            <div className="squad-card">
                <div className="squad-card-title">THE SQUAD</div>
                <div className="squad-card-text">Tap a character to open their data.</div>
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
                    icon: { symbol: 'backpack', color: '#f2ca50' },
                    onClick: () => setEquipView(true),
                },
                {
                    id: 'status',
                    label: 'Estatus',
                    icon: { symbol: 'auto_awesome', color: '#f2ca50' },
                    onClick: () => setStatusModal(true),
                },
                {
                    id: 'job',
                    label: 'Oficio',
                    icon: { symbol: 'person', color: '#f2ca50' },
                    onClick: () => api.showToast('The Jobs page is coming soon.'),
                },
            ]}
            back={{ label: 'Atrás', onClick: () => setSelectedId(null) }}
        />
    ) : selected && equipView ? (
        <OptionsBar
            size="lg"
            pinLast
            options={holeRows.map((row) => ({
                id: row.key,
                label: row.item ? row.item.name : 'Vacío',
                icon: { icon: row.icon },
                onClick: () => openHolePicker(row.hole),
            }))}
            back={{
                label: 'Atrás',
                // While a hole's picker is open, Atrás closes the picker
                // (back to the general equipment view); otherwise it
                // leaves the equipment view.
                onClick: () => {
                    if (selectedHole !== null) {
                        setSelectedHole(null);
                        setPreviewItem(null);
                    } else {
                        setEquipView(false);
                    }
                },
            }}
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
            <div className="team-main">
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
        </div>
    );
}
