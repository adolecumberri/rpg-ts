import { useRef, useState } from 'react';
import { DEFAULT_ELEMENTS } from '@core';
import { BattleCard } from '../components/UI/BattleCard';
import { FloatingDamageLayer } from '../components/UI/FloatingDamage';
import type { DamageKind, DamagePart, FloatingHit } from '../components/UI/FloatingDamage';

// The picker list: every engine element (in registry order) plus heal.
const KIND_OPTIONS: Array<{ id: DamageKind; name: string; icon: string }> = [
    ...DEFAULT_ELEMENTS.getAll().map((element) => ({
        id: element.id,
        name: element.name,
        icon: element.icon,
    })),
    { id: 'heal', name: 'Heal', icon: '✚' },
];

/**
 * The damages test bench: customize the hit (element, value, crit,
 * composite parts) and spawn floating numbers over a dummy ficha to
 * see how the object renders each case.
 */
export function DamagesScreen() {
    const [hits, setHits] = useState<FloatingHit[]>([]);
    const [selected, setSelected] = useState<DamageKind>('physical');
    const [value, setValue] = useState(10);
    const [crit, setCrit] = useState(false);
    const [parts, setParts] = useState<DamagePart[]>([{ element: 'physical', amount: 10 }]);

    const pageRef = useRef<HTMLDivElement | null>(null);
    const hitIdRef = useRef(0);

    const removeHit = (id: number) => setHits((prev) => prev.filter((hit) => hit.id !== id));

    const clampValue = (raw: string): number => {
        const parsed = parseInt(raw, 10);
        if (isNaN(parsed)) return 1;
        return Math.min(9999, Math.max(1, parsed));
    };

    // One hit over the dummy ficha, slightly jittered. A single part
    // becomes a plain hit; several parts become the composite object
    // (one final number, gradient fill).
    const spawn = () => {
        if (parts.length === 0) return;
        const page = pageRef.current;
        const cell = document.querySelector('[data-unit-id="damages-dummy"]');
        if (!page || !cell) return;
        const pageRect = page.getBoundingClientRect();
        const rect = cell.getBoundingClientRect();
        const x = rect.left - pageRect.left + rect.width / 2 + Math.round(Math.random() * 48 - 24);
        const y = rect.top - pageRect.top + Math.round(Math.random() * 24 - 8);
        const hit: FloatingHit = {
            id: ++hitIdRef.current,
            crit,
            x,
            y,
        };
        if (parts.length === 1) {
            hit.amount = parts[0].amount;
            hit.kind = parts[0].element;
        } else {
            hit.parts = parts.map((part) => ({ ...part }));
        }
        setHits((prev) => [...prev, hit].slice(-40));
    };

    const burst = () => {
        for (let index = 0; index < 5; index++) spawn();
    };

    const addPart = () => setParts((prev) => [...prev, { element: selected, amount: value }]);

    const removePart = (index: number) => setParts(
        (prev) => prev.filter((entry, entryIndex) => entryIndex !== index),
    );

    const summary = parts.length > 0 ?
        parts.map((part) => {
            const icon = part.element === 'heal' ?
                '✚' :
                DEFAULT_ELEMENTS.get(part.element)?.icon ?? '';
            return `${icon} ${part.amount}`;
        }).join(' + ') :
        'no parts';

    return (
        <div className="newui-page pixel-font" ref={pageRef} style={{ position: 'relative' }}>
            <FloatingDamageLayer hits={hits} onDone={removeHit} />
            <div className="pixel-panel">
                <div className="pixel-title">Damages</div>

                <div style={{ fontSize: 'var(--s3)', color: 'var(--muted)', marginBottom: 8 }}>Element</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s1)', marginBottom: 8 }}>
                    {KIND_OPTIONS.map((kind) => (
                        <button
                            key={kind.id}
                            type="button"
                            className={`pixel-btn${selected === kind.id ? ' pixel-btn--primary' : ''}`}
                            style={{ height: 'var(--s8)', fontSize: 11, padding: '0 var(--s2)' }}
                            onClick={() => setSelected(kind.id)}
                        >
                            {kind.icon} {kind.name}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                    <input
                        type="number"
                        className="pixel-input"
                        min={1}
                        max={9999}
                        inputMode="numeric"
                        value={value}
                        onChange={(event) => setValue(clampValue(event.target.value))}
                    />
                    <button
                        type="button"
                        className={`pixel-btn${crit ? ' pixel-btn--primary' : ''}`}
                        style={{ height: 'var(--s8)' }}
                        onClick={() => setCrit((flag) => !flag)}
                    >
                        💥 Crit {crit ? 'on' : 'off'}
                    </button>
                    <button
                        type="button"
                        className="pixel-btn"
                        style={{ height: 'var(--s8)' }}
                        onClick={addPart}
                    >
                        + Add part
                    </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s1)', marginBottom: 8 }}>
                    {parts.map((part, index) => (
                        <span key={`part_${index}`} className="pixel-chip">
                            {part.element === 'heal' ?
                                '✚' :
                                DEFAULT_ELEMENTS.get(part.element)?.icon ?? ''} {part.amount}
                            <button
                                type="button"
                                className="pixel-btn pixel-btn--danger"
                                style={{ height: 'var(--s6)', minWidth: 'var(--s6)', fontSize: 10 }}
                                aria-label="Remove part"
                                onClick={() => removePart(index)}
                            >
                                ✕
                            </button>
                        </span>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <button
                        type="button"
                        className="pixel-btn pixel-btn--primary"
                        disabled={parts.length === 0}
                        style={parts.length === 0 ? { opacity: 0.5 } : undefined}
                        onClick={spawn}
                    >
                        ▶ Spawn
                    </button>
                    <button
                        type="button"
                        className="pixel-btn"
                        disabled={parts.length === 0}
                        style={parts.length === 0 ? { opacity: 0.5 } : undefined}
                        onClick={burst}
                    >
                        Burst ×5
                    </button>
                    <button type="button" className="pixel-btn" onClick={() => setHits([])}>
                        Clear
                    </button>
                </div>

                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Current: {summary}{crit ? ' · crit 💥' : ''}
                </div>
            </div>

            <div className="damages-area">
                <BattleCard
                    name="Dummy"
                    hp={1000}
                    maxHp={1000}
                    level={1}
                    icon="🎯"
                    dataId="damages-dummy"
                />
            </div>
        </div>
    );
}
