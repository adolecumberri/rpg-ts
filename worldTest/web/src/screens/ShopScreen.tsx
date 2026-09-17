import { useState } from 'react';
import { useGame } from '../game/GameContext';
import { Menu } from '../components/Menu';
import { SHOP_ENTRIES } from '../game/data';

export function ShopScreen() {
    const api = useGame();
    const [tab, setTab] = useState<'buy' | 'sell'>('buy');
    const sellable = api.team.inventory.getAllNotEquipedItems();

    return (
        <div className="screen">
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="section-title" style={{ margin: 0 }}>Central Shop</span>
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
                <Menu
                    options={SHOP_ENTRIES.map((entry) => ({
                        icon: '🛒',
                        label: entry.item.name,
                        sub: `${entry.buyPrice}g`,
                        onClick: () => api.buy(entry),
                    }))}
                />
            ) : sellable.length === 0 ? (
                <div className="empty">Nothing to sell.</div>
            ) : (
                <Menu
                    options={sellable.map((slot) => ({
                        icon: '💰',
                        label: slot.item.name,
                        sub: `${slot.item.sellValue}g`,
                        onClick: () => api.sell(slot),
                    }))}
                />
            )}
        </div>
    );
}
