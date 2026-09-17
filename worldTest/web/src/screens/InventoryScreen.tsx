import { useState } from 'react';
import type { InventorySlot } from '@rpg';
import { useGame } from '../game/GameContext';
import { Menu } from '../components/Menu';

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
                        sub: picked.item.category === 'equipment' ? 'Equip' : 'Use',
                        onClick: () => {
                            if (picked.item.category === 'equipment') {
                                api.equipTo(picked.item, member.id);
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

    return (
        <div className="screen">
            {slots.length === 0 ? (
                <div className="empty">Inventory is empty.</div>
            ) : (
                <Menu
                    options={slots.map((slot) => {
                        const usable = slot.item.category === 'equipment' || slot.item.category === 'consumable';
                        return {
                            icon: slot.item.category === 'consumable' ? '🧪' : slot.item.category === 'equipment' ? '🗡️' : '🔑',
                            label: slot.item.name,
                            sub: `${slot.quantity}x · ${slot.item.category}${slot.item.equiped ? ' · Equipped' : ''}`,
                            onClick: () => {
                                if (usable) setPicked(slot);
                                else api.showToast(slot.item.description ?? slot.item.name);
                            },
                        };
                    })}
                />
            )}
        </div>
    );
}
