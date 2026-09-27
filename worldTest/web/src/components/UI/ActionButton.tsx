import type { CSSProperties } from 'react';

/**
 * The icon of an action button: either a single character (emoji, '›',
 * '‹'...) or an image (a sprite URL once the art exists).
 */
export type ActionIcon = string | { src: string; alt?: string };

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
    onClick?: () => void;
}) {
    const toneClass = tone === 'primary'
        ? 'pixel-btn--primary'
        : tone === 'danger' ? 'pixel-btn--danger' : '';

    const style: CSSProperties | undefined = slot
        ? { gridRow: Math.ceil(slot / 2), gridColumn: ((slot - 1) % 2) + 1 }
        : undefined;

    const iconNode = icon
        ? typeof icon === 'string'
            ? <span className="action-btn-icon">{icon}</span>
            : (
                <img
                    className="action-btn-icon action-btn-icon--img"
                    src={icon.src}
                    alt={icon.alt ?? ''}
                />
            )
        : null;

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
            <span className="action-btn-label">
                {iconNode}
                {label}
                {selected || mark ? (
                    <span className="action-btn-check">{mark ?? '✓'}</span>
                ) : null}
            </span>
        </button>
    );
}
