import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ActionButton } from './ActionButton';
import type { ActionIcon } from './ActionButton';

/**
 * One cell the bar renders. The bar is a pure chrome engine: it knows
 * nothing about skills, targets or selection semantics — it lays out
 * whatever cells it receives, paginates them and pins the controls.
 */
export type ActionBarCell = {
    id: string;
    label: string;
    icon?: ActionIcon;
    tone?: 'default' | 'primary' | 'danger';
    disabled?: boolean;
    disabledReason?: string;
    selected?: boolean;
    // The badge on a picked cell ('✓' or '✓×2' for stacked hits).
    mark?: string;
    // The muted sub-label under the label.
    sub?: string;
    onClick?: () => void;
};

// The three size modes: button height and page capacity.
// sm: 8u buttons x 5 rows (10 per page) · md: 10u x 4 rows (8) ·
// lg: 12u x 3 rows (6). All three total the same 44u of height.
const MODES = {
    sm: { capacity: 10 },
    md: { capacity: 8 },
    lg: { capacity: 6 },
} as const;

export type ActionBarSize = keyof typeof MODES;

function layoutFor(count: number): 'rows' | 'grid' {
    // 1-3 stack as rows, except 2 which fits a clean 50/50 grid.
    if (count === 2) return 'grid';
    return count <= 3 ? 'rows' : 'grid';
}

/**
 * The shared action-bar engine: the grid layout matrix, the pagination
 * with its page controls inside the grid, the pinned cancel slot, the
 * floating accept and the inline hint. Specialized bars (OptionsBar,
 * TargetBar) build the cells; the screen owns the state.
 *
 *   first page  = cancel (when picking) in slot 5 + More in slot 6
 *   middle pages = Back (page) in slot 5 + More in slot 6
 *   last page   = Back (page) in slot 5, slot 6 empty
 */
export function ActionBar({
    cells,
    size = 'lg',
    back,
    accept,
    pinLast = false,
    banner,
}: {
    cells: ActionBarCell[];
    size?: ActionBarSize;
    // The cancel option (slot 5 on the first page): shown while the
    // current pick is undoable. Renders as a standard action button
    // (icon slot + title) with the pixel close icon by default.
    back?: { label?: string; icon?: ActionIcon; onClick: () => void };
    // The floating accept: shown when the caller passes it, over the
    // panel's top edge, MD size.
    accept?: { label?: string; onClick: () => void };
    // The last cell is pinned to the final grid slot (6 in lg, where
    // More would sit) so short lists show it instead of paginating.
    pinLast?: boolean;
    // A text banner spanning the first two slots of the first page
    // (the world map shows the place name there).
    banner?: string;
}) {
    const [page, setPage] = useState(0);
    const [hint, setHint] = useState<string | null>(null);

    const mode = MODES[size];
    // The pinned cell leaves the paginated list.
    const list = pinLast && cells.length > 0 ? cells.slice(0, -1) : cells;
    const pinned = pinLast && cells.length > 0 ? cells[cells.length - 1] : undefined;
    // The cancel occupies a slot on the first page only, and the
    // banner occupies the first two slots of the first page.
    const special = back ? 1 : 0;
    const firstPage = mode.capacity - 1 - special - (banner ? 2 : 0);
    const middlePage = mode.capacity - 2;

    // A fresh cell list starts over at the first page.
    useEffect(() => {
        setPage(0);
    }, [cells, size]);

    useEffect(() => {
        if (!hint) return;
        const timer = window.setTimeout(() => setHint(null), 2200);
        return () => window.clearTimeout(timer);
    }, [hint]);

    if (cells.length === 0 && !back && !accept && !banner) return null;

    const capacity = mode.capacity - special;
    const pages = list.length <= capacity ?
        1 :
        1 + Math.ceil((list.length - firstPage) / middlePage);

    const start = page === 0 ? 0 : firstPage + (page - 1) * middlePage;
    const count = page === 0 ?
        Math.min(firstPage, list.length) :
        Math.min(middlePage, list.length - start);
    const visible = list.slice(start, start + count);
    // The banner spans two cells, so the bar always uses the grid.
    const layout = banner ?
        'grid' :
        layoutFor(pages === 1 ? visible.length + special + (pinned ? 1 : 0) : mode.capacity);

    const press = (cell: ActionBarCell) => {
        if (cell.disabled) {
            setHint(cell.disabledReason ?? `${cell.label} is unavailable.`);
            return;
        }
        cell.onClick?.();
    };

    const rendered: ReactNode[] = [];
    // The banner occupies the first two slots of the first page.
    if (banner && page === 0) {
        rendered.push(
            <div key="banner" className="action-bar-banner">{banner}</div>,
        );
    }
    for (const cell of visible) {
        rendered.push(
            <ActionButton
                key={cell.id}
                label={cell.label}
                icon={cell.icon}
                size={size}
                tone={cell.tone}
                disabled={cell.disabled}
                selected={cell.selected}
                mark={cell.mark}
                sub={cell.sub}
                onClick={() => press(cell)}
            />,
        );
    }

    // Slot 6 (the last): More on every page but the last — or the
    // pinned cell when pinLast reserves the slot.
    const nextSlot = pages > 1 && page < pages - 1 && !pinned ? mode.capacity : undefined;
    if (nextSlot !== undefined) {
        rendered.push(
            <ActionButton
                key="nav-next"
                label="More"
                icon="›"
                size={size}
                variant="nav"
                slot={nextSlot}
                onClick={() => setPage((p) => p + 1)}
            />,
        );
    }

    if (pinned) {
        rendered.push(
            <ActionButton
                key={`pinned-${pinned.id}`}
                label={pinned.label}
                icon={pinned.icon}
                size={size}
                tone={pinned.tone}
                disabled={pinned.disabled}
                selected={pinned.selected}
                mark={pinned.mark}
                slot={mode.capacity}
                onClick={() => press(pinned)}
            />,
        );
    }

    // Slot 5: Cancel on the first page (while picking), Back (page) on
    // the later ones.
    if (page === 0 && back) {
        rendered.push(
            <ActionButton
                key="cancel"
                label={back.label ?? 'Cancel'}
                icon={back.icon ?? { icon: 'atras' }}
                size={size}
                slot={mode.capacity - 1}
                onClick={back.onClick}
            />,
        );
    } else if (page > 0) {
        rendered.push(
            <ActionButton
                key="nav-back"
                label="Back"
                icon="‹"
                size={size}
                variant="nav"
                slot={mode.capacity - 1}
                onClick={() => setPage((p) => p - 1)}
            />,
        );
    }

    return (
        <div className={`action-bar action-bar--${size}`}>
            {accept ? (
                <div className="action-bar-accept">
                    <ActionButton
                        label={accept.label ?? 'Accept'}
                        icon="✓"
                        size="md"
                        tone="primary"
                        onClick={accept.onClick}
                    />
                </div>
            ) : null}
            {hint ? <div className="action-bar-hint pixel-inset">{hint}</div> : null}
            <div className={`action-bar-grid action-bar-grid--${layout}`}>{rendered}</div>
        </div>
    );
}
