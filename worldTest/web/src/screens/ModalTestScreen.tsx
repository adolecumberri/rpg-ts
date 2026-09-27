import { useState } from 'react';
import { Modal } from '../components/UI/Modal';

/**
 * Modal test screen: a button opens a menu modal; an item of the menu
 * opens a tooltip modal over it, and the tooltip opens a third dialog —
 * the stack shifts each one so all three stay visible.
 */
export function ModalTestScreen() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [tooltipOpen, setTooltipOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);

    return (
        <div className="newui-page pixel-font">
            <div className="pixel-panel">
                <div className="pixel-title">Modal stack</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                    Each modal opened over another shifts down-right one step, so a menu, its
                    tooltip and a dialog are all three visible at once.
                </div>
                <button className="pixel-btn pixel-btn--primary" onClick={() => setMenuOpen(true)}>
                    Open menu
                </button>
            </div>

            {/* Layer 1: the menu */}
            <Modal title="Menu" open={menuOpen} onClose={() => setMenuOpen(false)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button className="pixel-btn" onClick={() => setTooltipOpen(true)}>
                        ⚔️ Attack
                    </button>
                    <button className="pixel-btn" onClick={() => setTooltipOpen(true)}>
                        🎒 Items
                    </button>
                    <button className="pixel-btn" onClick={() => setMenuOpen(false)}>
                        ✕ Close
                    </button>
                </div>
            </Modal>

            {/* Layer 2: a tooltip opened from a menu item */}
            <Modal title="Tooltip" open={tooltipOpen} onClose={() => setTooltipOpen(false)}>
                <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>
                    ⚔️ Attack — swing your weapon at the nearest enemy in reach.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="pixel-btn" onClick={() => setDetailsOpen(true)}>
                        Details
                    </button>
                    <button className="pixel-btn" onClick={() => setTooltipOpen(false)}>
                        Got it
                    </button>
                </div>
            </Modal>

            {/* Layer 3: a dialog over the tooltip */}
            <Modal title="Details" open={detailsOpen} onClose={() => setDetailsOpen(false)}>
                <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>
                    Range short: hits only the closest filled enemy row.
                </div>
                <button className="pixel-btn" onClick={() => setDetailsOpen(false)}>
                    Close
                </button>
            </Modal>
        </div>
    );
}
