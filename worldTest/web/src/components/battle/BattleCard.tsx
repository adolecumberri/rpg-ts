import { SPRITE_BOX, spriteBoxStyle, spriteScaleFor, useSpriteFrames } from '../../assets/spriteFrames';
import type { SpriteAnimation } from '../../assets/sprites';

/**
 * The battle ficha: one character card on the battlefield. Isolated
 * component — the panel only passes data. Supports either an animated
 * sprite (the unit's SpriteAnimation: idle loop + one-shot attack) or a
 * plain icon fallback, plus the selection/turn/death states. The frame
 * size, count and timing all come from the sprite data.
 */
export function BattleCard({
    hp,
    maxHp,
    icon,
    sprite,
    attackSprite,
    level,
    selected,
    active,
    dead,
    shrink = false,
    attacking = false,
    dataId,
}: {
    hp: number;
    maxHp: number;
    icon?: string;
    // The unit's animation set (from battleUnitOf): the card owns the
    // frame stepping.
    sprite?: SpriteAnimation;
    attackSprite?: SpriteAnimation;
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
    // The fichas render the 16px frames at the battlefield box size
    // (the shrink variant keeps a 16px badge-sized frame).
    const box = shrink ? 16 : SPRITE_BOX.ficha;
    const scale = (animation: SpriteAnimation | undefined) =>
        animation ? spriteScaleFor(box, animation) : 1;
    // The attack pose is optional (the new archer/warrior art has no
    // attack sheet): without it the idle loop keeps playing.
    const hasAttackPose = Boolean(attackSprite);
    const idle = useSpriteFrames(sprite, {
        scale: scale(sprite),
        playing: !(attacking && hasAttackPose),
    });
    const attack = useSpriteFrames(attackSprite, { scale: scale(attackSprite), loop: false, playing: attacking });
    const hasSprite = Boolean(sprite);

    return (
        <div
            data-unit-id={dataId}
            className={[
                'pixel-cell battle-card',
                selected ? 'is-selected' : '',
                dead ? 'battle-card--dead' : '',
                shrink ? 'battle-card--shrink' : '',
                attacking && attackSprite ? 'battle-card--attacking' : '',
            ].join(' ')}
        >
            {!shrink && (
                <span className="battle-card-sub">
                    {level !== undefined ? `Lv ${level}` : ''}
                </span>
            )}
            {dead ? (
                <span className="battle-card-icon">💀</span>
            ) : hasSprite ? (
                <div
                    className={['battle-card-sprite',
                        active ? 'battle-card-sprite--active' : ''].join(' ')}
                    style={spriteBoxStyle(sprite, box)}
                >
                    <div
                        className="battle-card-sprite-layer battle-card-sprite-layer--idle"
                        style={idle.style}
                    />
                    {attackSprite ? (
                        <div
                            className={['battle-card-sprite-layer battle-card-sprite-layer--attack',
                                attacking ? 'battle-card-sprite-layer--attack-on' : ''].join(' ')}
                            style={attack.style}
                        />
                    ) : null}
                </div>
            ) : (
                <span className="battle-card-icon">{icon ?? '❔'}</span>
            )}
            {!shrink && <span className="battle-card-sub">
                {hp}/{maxHp}
            </span>}
        </div>
    );
}
