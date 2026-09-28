/**
 * Floating damage numbers. The parent owns the instances and passes
 * their data (amount, kind and position relative to the layer); each
 * instance is an absolutely-positioned object that rises and fades out,
 * and reports its end through onDone so the parent can drop it.
 * Colors per damage kind land later on the kind classes below.
 */
export type DamageKind = 'physical' | 'magical' | 'true' | 'heal';

export type FloatingHit = {
    id: number;
    amount: number;
    kind: DamageKind;
    // Position relative to the FloatingDamageLayer's box.
    x: number;
    y: number;
};

export function FloatingDamage({
    hit,
    onDone,
}: {
    hit: FloatingHit;
    onDone: (id: number) => void;
}) {
    const sign = hit.kind === 'heal' ? '+' : '-';
    return (
        <div
            className={`floating-damage floating-damage--${hit.kind}`}
            style={{ left: hit.x, top: hit.y }}
            onAnimationEnd={() => onDone(hit.id)}
        >
            {sign}
            {hit.amount}
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
