import { UI_CANVAS, UI_MAX_SCALE, useUiScale } from '../game/uiScale';

/**
 * The UI kit page: like the dev page but for the visual design. Every
 * piece of the pixel-art interface is prototyped here against the
 * fixed canvas, and the header shows the current scale multiplier.
 */
export function UiScreen() {
    const scale = useUiScale();

    return (
        <div className="newui-page pixel-font">
            <div className="pixel-panel">
                <div className="pixel-title">Canvas</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11 }}>
                    <span>{UI_CANVAS.width}×{UI_CANVAS.height} px</span>
                    <span>scale ×{scale} (max ×{UI_MAX_SCALE})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    <span>window {window.innerWidth}×{window.innerHeight}</span>
                    <span>device px ratio {window.devicePixelRatio}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                    Global tokens: <span style={{ color: 'var(--text)' }}>--u: 4px</span> (1 unit) ·{' '}
                    <span style={{ color: 'var(--text)' }}>--ui-scale: {scale}</span>. The canvas
                    transform multiplies everything by the scale, so 8px of margin is 16 device
                    px at ×2.
                </div>
            </div>

            <div className="pixel-panel">
                <div className="pixel-title">Buttons</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button className="pixel-btn">Default</button>
                    <button className="pixel-btn pixel-btn--primary">Primary</button>
                    <button className="pixel-btn pixel-btn--danger">Danger</button>
                    <button className="pixel-btn" disabled>Disabled</button>
                </div>
            </div>

            <div className="pixel-panel">
                <div className="pixel-title">Bars</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, width: 24 }}>HP</span>
                        <div className="pixel-bar pixel-bar--hp" style={{ flex: 1 }}>
                            <div className="pixel-bar-fill" style={{ width: '68%' }} />
                        </div>
                        <span style={{ fontSize: 11 }}>68/100</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, width: 24 }}>XP</span>
                        <div className="pixel-bar pixel-bar--xp" style={{ flex: 1 }}>
                            <div className="pixel-bar-fill" style={{ width: '30%' }} />
                        </div>
                        <span style={{ fontSize: 11 }}>30/100</span>
                    </div>
                </div>
            </div>

            <div className="pixel-panel">
                <div className="pixel-title">Status chips</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span className="pixel-chip">⚔️ Attack Up</span>
                    <span className="pixel-chip pixel-chip--bad">🩸 Bleeding 2t</span>
                    <span className="pixel-chip pixel-chip--good">✨ Revolutionary Aura</span>
                    <span className="pixel-chip">⚰️ Fainted</span>
                </div>
            </div>

            <div className="pixel-panel pixel-dialog">
                <div className="pixel-title">Dialog</div>
                <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>
                    <span style={{ color: 'var(--accent)' }}>General Roderick:</span> The league had a
                    leader — they call him the Farmer King.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button className="pixel-btn">⚔️ Attack</button>
                    <button className="pixel-btn">💬 Talk</button>
                    <button className="pixel-btn">🏃 Run</button>
                </div>
            </div>

            <div className="pixel-panel">
                <div className="pixel-title">Sizes · 1 unit = 4px</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                    The ladder: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64. Everything
                    sizes in units — border 1u, gap/padding 2u, icon 8u, button height 12u.
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div className="sprite-sample sprite-sample--16">🌾</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>16 sprite</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div className="sprite-sample sprite-sample--32">🌾</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>32 icon</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div className="sprite-sample sprite-sample--48">🌾</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>48 button icon</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div className="sprite-sample sprite-sample--64">🌾</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>64 ability</div>
                    </div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>
                    16 → 32 and 16 → 48 are integer ×2 / ×3 upscales: sprites stay crisp.
                </div>
            </div>

            <div className="pixel-panel">
                <div className="pixel-title">Formation cells</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {['🛡️ Front', '⚔️ Center', '🏹 Back'].map((row) => (
                        <div key={row} style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>
                            {row}
                            <div className="pixel-cell">🌾</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pixel-panel">
                <div className="pixel-title">Type</div>
                <div style={{ fontSize: 16 }}>The quick brown fox</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Small muted text for hints</div>
                <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--accent)' }}>
                    Uppercase label
                </div>
            </div>
        </div>
    );
}
