import { ActionBar } from './ActionBar';
import type { ActionBarCell, ActionBarSize } from './ActionBar';
import type { ActionIcon } from './ActionButton';
import type { ReactNode } from 'react';

/**
 * One option of a general menu bar: skills, menu entries, choices.
 * The bar has no selection semantics — each option is a button.
 */
export type OptionSpec = {
    id: string;
    label: string;
    icon?: ActionIcon;
    tone?: 'default' | 'primary' | 'danger';
    // A color for the button's left border accent (the battle commands:
    // attack red, skill blue, defend yellow, flee red).
    accent?: string;
    disabled?: boolean;
    disabledReason?: string;
    // The muted sub-label under the label.
    sub?: string;
    // The hover tooltip shown over the cell (skills: only the stat
    // changes — the label already carries the skill name).
    tip?: string;
    // A corner chip next to the label (the gold ↑ level-up badge:
    // guides the player to the bar entry that resolves it).
    badge?: string;
    // The grid slot (1-based) and whether the option spans the whole
    // row — screens pin their buttons to fixed places.
    slot?: number;
    wide?: boolean;
    onClick?: () => void;
};

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
    fixedRows = false,
}: {
    options: OptionSpec[];
    size?: ActionBarSize;
    back?: { label?: string; icon?: ActionIcon; wide?: boolean; onClick: () => void };
    // The last option is pinned to the final grid slot (6 in lg).
    pinLast?: boolean;
    // A banner spanning the first two slots of the first page (any
    // node: text, or a compact card like the combat forecast's).
    banner?: ReactNode;
    // The grid keeps its fixed row heights even for empty rows (a
    // button pinned to a lower row stays at the bottom of the bar).
    fixedRows?: boolean;
}) {
    const cells: ActionBarCell[] = options.map((option) => ({
        id: option.id,
        label: option.label,
        icon: option.icon,
        tone: option.tone,
        accent: option.accent,
        disabled: option.disabled,
        disabledReason: option.disabledReason,
        sub: option.sub,
        tip: option.tip,
        badge: option.badge,
        slot: option.slot,
        wide: option.wide,
        onClick: option.onClick,
    }));

    return (
        <ActionBar
            cells={cells}
            size={size}
            back={back}
            pinLast={pinLast}
            banner={banner}
            fixedRows={fixedRows}
        />
    );
}
