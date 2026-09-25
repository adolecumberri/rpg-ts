import { useState } from 'react';
import type { InventorySlot } from '@rpg';
import { isEquippableCategory } from '@rpg/classes/items/Item';
import {
    CATEGORY_ICONS,
    groupItemsBySection,
    inventoryCapacity,
    inventorySlotCount,
    itemDescriptionText,
    missionPlaceNames,
} from '@core';
import { useGame } from '../game/GameContext';
import { Menu, MenuSection } from '../components/Menu';

export function InventoryScreen() {
    const api = useGame();
    const [picked, setPicked] = useState<InventorySlot | null>(null);

    if (picked) {
        const members = api.team.getAll();
        return (
            <div className="screen">
                <div className="section-title">Use on whom?</div>
                <Menu
                    options={members.map((member) => ({
                        label: member.name,
                        sub: isEquippableCategory(picked.item.category) ? 'Equip' : 'Use',
                        onClick: () => {
                            if (isEquippableCategory(picked.item.category)) {
                                api.equipTo(picked.item.id, member.id);
                            } else {
                                api.useOn(picked, member.id);
                            }
                            setPicked(null);
                        },
                    }))}
                />
                <button className="btn" onClick={() => setPicked(null)}>Back</button>
            </div>
        );
    }

    const slots = api.team.inventory.getAllItems();
    const sections = groupItemsBySection(slots);

    return (
        <div className="screen">
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10 }}>
                <span className="section-title" style={{ margin: 0 }}>Inventory</span>
                <span className="tag">
                    🎒 {inventorySlotCount(api.team.inventory)}/{inventoryCapacity(api.team)} slots
                </span>
            </div>
            {slots.length === 0 ? (
                <div className="empty">Inventory is empty.</div>
            ) : (
                sections.map((section) => (
                    <MenuSection
                        key={section.title}
                        title={section.title}
                        options={section.entries.map((slot) => {
                            const equippable = isEquippableCategory(slot.item.category);
                            const consumable = slot.item.category === 'consumable';
                            const available = slot.quantity;
                            const owned = slot.totalQuantity;
                            const equipped = owned - available;
                            return {
                                icon: CATEGORY_ICONS[slot.item.category] ?? '🎒',
                                label: slot.item.name,
                                description: itemDescriptionText(slot.item),
                                sub: `${available}/${owned}${equipped > 0 ? ` · ${equipped} equipped` : ''}`,
                                disabled: (equippable || consumable) && available === 0,
                                onClick: () => {
                                    if (equippable || consumable) setPicked(slot);
                                    else api.showToast(slot.item.description ?? slot.item.name);
                                },
                            };
                        })}
                    />
                ))
            )}

            <MenuSection
                title="Missions"
                icon="📜"
                options={api.session.missions.activeMissions().map((runner) => {
                    const mission = api.session.missions.mission(runner.missionId());
                    const places = mission ? missionPlaceNames(mission) : [];
                    return {
                        icon: '❗',
                        label: runner.title(),
                        description: places.length > 0 ? `📍 ${places.join(' · ')}` : undefined,
                        sub: 'Open',
                        onClick: () => api.navigate({ name: 'mission', missionId: runner.missionId() }),
                    };
                })}
            />
            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
