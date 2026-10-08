import { useState } from 'react';
import type { Item } from '@rpg';
import { sectionOfItem } from '@core';
import { useGame } from '../game/GameContext';
import { statsOfItems } from '../game/equipmentStats';
import { OptionsBar } from '../components/UI/OptionsBar';
import { Icon } from '../components/UI/Icon';
import { StatsColumn } from '../components/UI/StatsColumn';
import { ALL_SECTIONS, EquipPicker, SECTION_META } from '../components/UI/EquipPicker';

// The picker's equipment sections plus the catch-all for everything
// else the player owns (wood, hay, consumables...).
const INVENTORY_SECTIONS = [...ALL_SECTIONS, 'otros'] as const;
type InventorySection = typeof INVENTORY_SECTIONS[number];
const INVENTORY_META: Record<InventorySection, { label: string; icon: string }> = {
    ...SECTION_META,
    otros: { label: 'Otros', icon: 'default' },
};

/**
 * The inventory page (party → Inventory): the picker takes the top
 * half of the page; the bottom half is the data display of the tapped
 * item — the stats ledger on the left half and the item's skills (the
 * Guinsoo, the Spike Shield...) on the right half. Purely informative.
 */
export function InventoryPage({ onBack }: { onBack?: () => void }) {
    const api = useGame();
    const [section, setSection] = useState<InventorySection>('espadas');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const slots = api.team.inventory
        .getAllItems()
        .filter((slot) => slot.totalQuantity > 0);
    const selected: Item | undefined = slots.find(
        (slot) => slot.item.id === selectedId,
    )?.item;

    const rows = slots
        .filter((slot) => (sectionOfItem(slot.item) ?? 'otros') === section)
        .map((slot) => (
            <div
                key={slot.id}
                className={`inv-item-row${slot.item.id === selectedId ? ' inv-item-row--preview' : ''}`}
                onClick={() => setSelectedId(slot.item.id)}
            >
                <span className="inv-item-icon">
                    <Icon id={slot.item.definition.icon ?? 'default'} size={4} />
                </span>
                <span className="inv-item-info">
                    <span className="inv-item-name">{slot.item.name}</span>
                </span>
                <span className="inv-count">{slot.totalQuantity - slot.quantity}</span>
                <span className="inv-count">{slot.totalQuantity}</span>
            </div>
        ));

    const skills = selected?.definition.skills ?? [];

    return (
        <div className="pixel-font" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="team-main">
                <div className="equip-view inventory-page">
                    <div className="inventory-picker">
                        <EquipPicker
                            title="Inventario"
                            sections={INVENTORY_SECTIONS}
                            sectionMeta={INVENTORY_META}
                            activeSection={section}
                            onSectionChange={setSection}
                            emptyText="No items."
                            rows={rows}
                        />
                    </div>
                    <div className="inventory-data">
                        {selected ? (
                            <>
                                <StatsColumn rows={statsOfItems([selected])} title="ESTADÍSTICAS" />
                                <div className="inventory-skills">
                                    <div className="team-data-stats-title">HABILIDADES</div>
                                    {skills.length === 0 ? (
                                        <span className="inventory-skill-empty">Sin habilidades.</span>
                                    ) : (
                                        skills.map((skill) => (
                                            <div key={skill.name} className="inventory-skill">
                                                <span className="inventory-skill-name">{skill.name}</span>
                                                <span className="inventory-skill-desc">{skill.description}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="inventory-data-hint">
                                Toca un objeto para ver sus datos.
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <OptionsBar
                size="lg"
                options={[]}
                back={onBack ? { label: 'Atrás', onClick: onBack } : undefined}
            />
        </div>
    );
}
