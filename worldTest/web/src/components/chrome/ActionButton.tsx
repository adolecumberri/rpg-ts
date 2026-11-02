import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import type { ActionBarCell } from './ActionBar';

/**
 * The icon of an action button: a single character (emoji, '✓'), an
 * image ({src}), a dictionary icon ({icon: id}) rendered at a fixed
 * size so nothing overflows the cell, a flat vector SVG ({svg: path})
 * from the design (no outline), or a Material Symbol ({symbol: name})
 * from the icon font.
 */
export type ActionIcon =
    | string
    | { src: string; alt?: string }
    | { icon: string; size?: number }
    | { svg: string; color?: string }
    | { symbol: string; color?: string };

// Default icon sizes per bar size, in UI units (1u = 4px): fixed so
// nothing overflows the cell.
const ICON_SIZES: Record<'sm' | 'md' | 'lg', number> = {
    sm: 3.5,
    md: 4.5,
    lg: 5.5,
};

/**
 * The button's props: the bar cell WITHOUT its identity fields (the
 * cell owns id/custom; the button owns size and click). One shape, not
 * a parallel copy.
 */
export type ActionButtonProps = Omit<ActionBarCell, 'id' | 'custom' | 'onClick'> & {
    size?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
};

/**
 * One cell of the action bar: a button component (not raw HTML) that
 * receives its presentation through props. The bar decides the grid
 * slot, size mode, tone and variant.
 */
export function ActionButton({
    label,
    icon,
    size = 'lg',
    tone = 'default',
    accent,
    disabled,
    selected,
    mark,
    badge,
    slot,
    wide,
    sub,
    tip,
    onClick,
}: ActionButtonProps) {
    const toneClass = tone === 'primary' ?
        'pixel-btn--primary' :
        tone === 'danger' ? 'pixel-btn--danger' : '';

    const style: CSSProperties = {};
    if (slot) {
        style.gridRow = Math.ceil(slot / 2);
        style.gridColumn = wide ? '1 / span 2' : ((slot - 1) % 2) + 1;
    }
    if (accent) {
        style.borderLeft = `3px solid ${accent}`;
    }

    let iconNode: ReactNode = null;
    if (icon) {
        if (typeof icon === 'string') {
            iconNode = <span className="action-btn-icon">{icon}</span>;
        } else if ('src' in icon) {
            iconNode = (
                <img
                    className="action-btn-icon action-btn-icon--img"
                    src={icon.src}
                    alt={icon.alt ?? ''}
                />
            );
        } else if ('svg' in icon) {
            iconNode = (
                <svg
                    className="action-btn-svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    style={{ color: icon.color ?? 'currentColor' }}
                    aria-hidden="true"
                >
                    <path d={icon.svg} />
                </svg>
            );
        } else if ('symbol' in icon) {
            iconNode = (
                <span
                    className="action-btn-icon action-btn-symbol material-symbol"
                    style={{ color: icon.color ?? 'currentColor' }}
                    aria-hidden="true"
                >
                    {icon.symbol}
                </span>
            );
        } else {
            iconNode = <Icon id={icon.icon} size={icon.size ?? ICON_SIZES[size]} />;
        }
    } else {
        // No icon: fall back to the default pixel icon of the system
        // (never an empty slot).
        iconNode = <Icon id="default" size={ICON_SIZES[size]} />;
    }

    const checkNode = selected || mark ? (
        <span className="action-btn-check">{mark ?? '✓'}</span>
    ) : null;

    const badgeNode = badge ? (
        <span className="action-btn-badge" title="Level up available">{badge}</span>
    ) : null;

    return (
        <button
            type="button"
            className={[
                'action-btn',
                `action-btn--${size}`,
                'pixel-btn',
                toneClass,
                selected ? 'action-btn--selected' : '',
            ].join(' ')}
            disabled={disabled}
            style={style}
            onClick={onClick}
        >
            {iconNode ? <span className="action-btn-slot">{iconNode}</span> : null}
            <span className="action-btn-text">
                <span className="action-btn-label action-btn-title">
                    <span className="action-btn-label-text">{label}</span>
                    {badgeNode}
                    {checkNode}
                </span>
                {sub ? <span className="action-btn-caption">{sub}</span> : null}
            </span>
            {tip ? <span className="ui-tooltip">{tip}</span> : null}
        </button>
    );
}
