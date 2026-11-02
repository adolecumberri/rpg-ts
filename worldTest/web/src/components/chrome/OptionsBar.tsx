import { ActionBar } from './ActionBar';
import type { ActionBarCell, ActionBarSize } from './ActionBar';
import type { ActionIcon } from './ActionButton';
import type { ReactNode } from 'react';

/**
 * One option of a general menu bar: skills, menu entries, choices.
 * The bar has no selection semantics — each option is a button.
 * The shape IS the bar cell: one type, no parallel copy.
 */
export type OptionSpec = ActionBarCell;

/**
 * The general action bar: shows a list of options (paginated, with the
 * optional cancel) and reports taps to the screen.
 */
export function OptionsBar({
    options,
    size = 'lg',
    back,
    pinLast = false,
    banner,
}: {
    options: OptionSpec[];
    size?: ActionBarSize;
    back?: { label?: string; icon?: ActionIcon; wide?: boolean; onClick: () => void };
    // The last option is pinned to the final grid slot (6 in lg).
    pinLast?: boolean;
    // A banner spanning the first two slots of the first page (any
    // node: text, or a compact card like the combat forecast's).
    banner?: ReactNode;
}) {
    return (
        <ActionBar
            cells={options}
            size={size}
            back={back}
            pinLast={pinLast}
            banner={banner}
        />
    );
}
