import { DEFAULT_ELEMENTS } from '@core';
import type { ElementId } from '@core';
import type { CSSProperties } from 'react';

/**
 * Floating damage numbers. The parent owns the instances and passes
 * their data; each instance rises and fades over its position and
 * reports its end through onDone so the parent can drop it.
 *
 * One object, every case:
 *  - kind: the engine element (or 'heal') decides the color and the
 *    glyph — the icons come straight from DEFAULT_ELEMENTS, so
 *    blunt/pierce/fire/ice reuse the game's own vocabulary.
 *  - crit: the crit icon before the value (a sprite slot later).
 *  - parts: the guinsoo case — several resolved components. The object
 *    shows the FINAL total as one number whose fill is a gradient
 *    split proportionally to each component's share (physical 10 +
 *    arcane 5 reads "15" two-thirds yellow, one-third blue), the same
 *    shape the DamageComposer returns (total + component lines).
 */

export type DamageKind = ElementId | 'heal';

export type DamagePart = {
    element: DamageKind;
    amount: number;
};

export type FloatingHit = {
    id: number;
    // Single-component hit.
    amount?: number;
    kind?: DamageKind;
    // Composite hit: replaces amount/kind when set.
    parts?: DamagePart[];
    // Crit: shows the crit icon before the value.
    crit?: boolean;
    // Position relative to the FloatingDamageLayer's box.
    x: number;
    y: number;
};

// One color per kind. Physical stays warm yellow, arcane (the
// "magical" family) blue, true white/grey, heal green; the physical
// subtypes and the magical elements get their own tone, and the glyph
// (from DEFAULT_ELEMENTS) disambiguates.
export const DAMAGE_COLORS: Record<DamageKind, string> = {
    physical: '#f5d442',
    pierce: '#c9d4de',
    blunt: '#c08a5e',
    fire: '#ff7b4a',
    ice: '#8fe3ff',
    lightning: '#fff3b0',
    poison: '#b06ee0',
    arcane: '#7f8cff',
    true: '#e2e2e2',
    heal: '#66bb6a',
};

const HEAL_GLYPH = '✚';

const glyphOf = (kind: DamageKind): string | undefined =>
    kind === 'heal' ? HEAL_GLYPH : DEFAULT_ELEMENTS.get(kind)?.icon;

const colorOf = (kind: DamageKind): string => DAMAGE_COLORS[kind] ?? DAMAGE_COLORS.physical;

/** The composite fill: color stops at each component's share of the total. */
function gradientFor(parts: DamagePart[]): string {
    const total = parts.reduce((sum, part) => sum + part.amount, 0);
    if (total <= 0) return '';
    let cursor = 0;
    const stops: string[] = [];
    for (const part of parts) {
        const from = (cursor / total) * 100;
        cursor += part.amount;
        const to = (cursor / total) * 100;
        const color = colorOf(part.element);
        stops.push(`${color} ${from}%`, `${color} ${to}%`);
    }
    return `linear-gradient(to right, ${stops.join(', ')})`;
}

export function FloatingDamage({
    hit,
    onDone,
}: {
    hit: FloatingHit;
    onDone: (id: number) => void;
}) {
    const parts = hit.parts && hit.parts.length > 0 ?
        hit.parts :
        [{ element: hit.kind ?? 'physical', amount: hit.amount ?? 0 }];
    const composite = parts.length > 1;
    const total = parts.reduce((sum, part) => sum + part.amount, 0);
    const sign = parts.every((part) => part.element === 'heal') ? '+' : '-';
    const glyph = composite ? undefined : glyphOf(parts[0].element);

    const style: CSSProperties = { left: hit.x, top: hit.y };
    if (composite) {
        style.backgroundImage = gradientFor(parts);
        style.WebkitBackgroundClip = 'text';
        style.backgroundClip = 'text';
    } else {
        style.color = colorOf(parts[0].element);
    }

    return (
        <div
            className={`floating-damage${composite ? ' floating-damage--composite' : ''}`}
            style={style}
            onAnimationEnd={() => onDone(hit.id)}
        >
            {hit.crit ? <span className="floating-damage-crit">💥</span> : null}
            {glyph ? <span className="floating-damage-glyph">{glyph}</span> : null}
            <span>{sign}{total}</span>
        </div>
    );
}

/** The positioned container the floating numbers live in. */
export function FloatingDamageLayer({
    hits,
    onDone,
}: {
    hits: FloatingHit[];
    onDone: (id: number) => void;
}) {
    return (
        <div className="floating-damage-layer">
            {hits.map((hit) => (
                <FloatingDamage key={hit.id} hit={hit} onDone={onDone} />
            ))}
        </div>
    );
}
