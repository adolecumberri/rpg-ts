import { useState } from 'react';
import { useGame } from '../game/GameContext';
import { MenuSection } from '../components/Menu';
import { CATEGORY_ICONS, groupItemsBySection, itemDescriptionText, SHOPS } from '@core';

export function ShopScreen({ shopId }: { shopId?: string }) {
    const api = useGame();
    const [tab, setTab] = useState<'buy' | 'sell'>('buy');
    const sellable = api.team.inventory.getAllNotEquipedItems();

    const entries = api.session.shopEntries(shopId ?? '');
    const shopName = (shopId ? SHOPS[shopId]?.name : undefined) ?? 'Shop';

    const buySections = groupItemsBySection(entries);
    const sellSections = groupItemsBySection(sellable);

    return (
        <div className="screen">
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="section-title" style={{ margin: 0 }}>{shopName}</span>
                <span className="tag gold">🪙 {api.team.gold}g</span>
            </div>

            <div className="btn-row">
                <button className={`btn${tab === 'buy' ? ' btn--primary' : ''}`} onClick={() => setTab('buy')}>
                    Buy
                </button>
                <button className={`btn${tab === 'sell' ? ' btn--primary' : ''}`} onClick={() => setTab('sell')}>
                    Sell
                </button>
            </div>

            {tab === 'buy' ? (
                entries.length === 0 ? (
                    <div className="empty">The shop is closed.</div>
                ) : (
                    buySections.map((section) => (
                        <MenuSection
                            key={section.title}
                            title={section.title}
                            options={section.entries.map((entry) => ({
                                icon: CATEGORY_ICONS[entry.item.category] ?? '🛒',
                                label: entry.item.name,
                                description: itemDescriptionText(entry.item),
                                sub: `${entry.buyPrice}g`,
                                onClick: () => api.buy(shopId, entry),
                            }))}
                        />
                    ))
                )
            ) : sellable.length === 0 ? (
                <div className="empty">Nothing to sell.</div>
            ) : (
                sellSections.map((section) => (
                    <MenuSection
                        key={section.title}
                        title={section.title}
                        options={section.entries.map((slot) => ({
                            icon: CATEGORY_ICONS[slot.item.category] ?? '💰',
                            label: slot.item.name,
                            description: itemDescriptionText(slot.item),
                            sub: `${slot.item.sellValue}g · ${slot.quantity} available`,
                            onClick: () => api.sell(slot),
                        }))}
                    />
                ))
            )}
            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
