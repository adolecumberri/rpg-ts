/**
 * The battle ficha: one character card on the battlefield. Isolated
 * component — the panel only passes data. Supports either an animated
 * sprite (a 64x16 sheet, 4 idle frames side by side, rendered at
 * 32x32) or a plain icon fallback, plus the selection/turn/death
 * states.
 */
export function BattleCard({
    name,
    hp,
    maxHp,
    sub,
    icon,
    sprite,
    selected,
    active,
    dead,
}: {
    name: string;
    hp: number;
    maxHp: number;
    sub?: string;
    icon?: string;
    // Sprite sheet URL (4 idle frames side by side, 16x16 each).
    sprite?: string;
    selected?: boolean;
    active?: boolean;
    dead?: boolean;
}) {
    return (
        <div
            className={[
                'pixel-cell battle-card',
                selected ? 'pixel-cell--selected' : '',
                active ? 'pixel-cell--active' : '',
                dead ? 'battle-card--dead' : '',
            ].join(' ')}
        >
            {dead ? (
                <span className="battle-card-icon">💀</span>
            ) : sprite ? (
                <div
                    className="battle-card-sprite"
                    style={{ backgroundImage: `url(${sprite})` }}
                />
            ) : (
                <span className="battle-card-icon">{icon ?? '❔'}</span>
            )}
            <span className="battle-card-name">{name}</span>
            <span className="battle-card-sub">
                {hp}/{maxHp}
                {sub ? ` · ${sub}` : ''}
            </span>
        </div>
    );
}
