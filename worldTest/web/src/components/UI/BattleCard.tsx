/**
 * The battle ficha: one character card on the battlefield. Isolated
 * component — the panel only passes data. Supports either an animated
 * sprite (a 64x16 sheet, 4 idle frames side by side, rendered at
 * 32x32) or a plain icon fallback, plus the selection/turn/death
 * states. While `attacking`, the card swaps to the unit's one-shot
 * attack sheet; when the flag clears (the damage was applied) it
 * returns to the idle loop.
 */
export function BattleCard({
    name,
    hp,
    maxHp,
    sub,
    icon,
    sprite,
    level,
    selected,
    active,
    dead,
    shrink = false,
    attacking = false,
    dataId,
}: {
    name: string;
    hp: number;
    maxHp: number;
    sub?: string;
    icon?: string;
    // A single idle sheet URL, or a set with the attack sheet too.
    sprite?: string | { idle: string; attack?: string };
    level?: number;
    selected?: boolean;
    active?: boolean;
    dead?: boolean;
    shrink?: boolean;
    attacking?: boolean;
    // The unit's id, exposed as data-unit-id so parents can locate the
    // card in the DOM (floating damage positioning).
    dataId?: string;
}) {
    const idle = typeof sprite === 'string' ? sprite : sprite?.idle;
    const attack = typeof sprite === 'string' ? undefined : sprite?.attack;
    const sheet = attacking && attack ? attack : idle;

    return (
        <div
            data-unit-id={dataId}
            className={[
                'pixel-cell battle-card',
                selected ? 'pixel-cell--selected' : '',
                dead ? 'battle-card--dead' : '',
                shrink ? 'battle-card--shrink' : '',
                attacking && attack ? 'battle-card--attacking' : '',
            ].join(' ')}
        >
            {!shrink && (
                <span className="battle-card-sub">
                    {level !== undefined ? `Lv ${level}` : ''}
                </span>
            )}
            {dead ? (
                <span className="battle-card-icon">💀</span>
            ) : sheet ? (
                <div
                    className={["battle-card-sprite",
                        active ? 'battle-card-sprite--active' : '',].join(' ')}
                >
                    <div
                        className="battle-card-sprite-layer battle-card-sprite-layer--idle"
                        style={{ backgroundImage: `url(${idle})` }}
                    />
                    {attack ? (
                        <div
                            className={['battle-card-sprite-layer battle-card-sprite-layer--attack',
                                attacking ? 'battle-card-sprite-layer--attack-on' : ''].join(' ')}
                            style={{ backgroundImage: `url(${attack})` }}
                        />
                    ) : null}
                </div>
            ) : (
                <span className="battle-card-icon">{icon ?? '❔'}</span>
            )}
            {/* <span className="battle-card-name">{name}</span> */}
            {!shrink && <span className="battle-card-sub">
                {hp}/{maxHp}
            </span>}
        </div>
    );
}
