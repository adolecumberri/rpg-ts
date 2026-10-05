import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * The icon of an action button: a single character (emoji, '›', '‹'),
 * an image ({src}), a dictionary icon ({icon: id}) rendered at a
 * fixed size so nothing overflows the cell, a flat vector SVG
 * ({svg: path}) from the design (no outline), or a Material Symbol
 * ({symbol: name}) from the icon font.
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
 * One cell of the action bar: a button component (not raw HTML) that
 * receives its presentation through props. The bar decides the grid
 * slot, size mode, tone and variant.
 */
export function ActionButton({
    label,
    icon,
    size = 'lg',
    tone = 'default',
    variant = 'action',
    disabled,
    selected,
    mark,
    slot,
    sub,
    onClick,
}: {
    label: string;
    icon?: ActionIcon;
    size?: 'sm' | 'md' | 'lg';
    tone?: 'default' | 'primary' | 'danger';
    // 'nav' is the quieter page-control style (Back/More cells).
    variant?: 'action' | 'nav';
    disabled?: boolean;
    // Multi-target picking: the cell shows the selected state.
    selected?: boolean;
    // The badge on a picked cell: '✓' by default, or '✓×2' for
    // multi-hit skills that may stack hits on one target.
    mark?: string;
    // The grid slot (1-based): row 3 col 2 for slot 6, etc. Keeps the
    // page controls pinned to their slots on short pages.
    slot?: number;
    // The muted sub-label under the main label (the design's buttons:
    // icon slot + text + subtext).
    sub?: string;
    onClick?: () => void;
}) {
    const toneClass = tone === 'primary' ?
        'pixel-btn--primary' :
        tone === 'danger' ? 'pixel-btn--danger' : '';

    const style: CSSProperties | undefined = slot ?
        { gridRow: Math.ceil(slot / 2), gridColumn: ((slot - 1) % 2) + 1 } :
        undefined;

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
    } else if (variant !== 'nav') {
        // No icon: fall back to the default pixel icon of the system
        // (never an empty slot).
        iconNode = <Icon id="default" size={ICON_SIZES[size]} />;
    }

    const checkNode = selected || mark ? (
        <span className="action-btn-check">{mark ?? '✓'}</span>
    ) : null;

    return (
        <button
            type="button"
            className={[
                'action-btn',
                `action-btn--${size}`,
                `action-btn--${variant}`,
                'pixel-btn',
                toneClass,
                selected ? 'action-btn--selected' : '',
            ].join(' ')}
            disabled={disabled}
            style={style}
            onClick={onClick}
        >
            {variant === 'nav' ? (
                <span className="action-btn-label">
                    {iconNode}
                    {label}
                </span>
            ) : (
                <>
                    {iconNode ? <span className="action-btn-slot">{iconNode}</span> : null}
                    <span className="action-btn-text">
                        <span className="action-btn-label action-btn-title">
                            <span className="action-btn-label-text">{label}</span>
                            {checkNode}
                        </span>
                        {sub ? <span className="action-btn-caption">{sub}</span> : null}
                    </span>
                </>
            )}
        </button>
    );
}
