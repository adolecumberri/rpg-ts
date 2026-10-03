import { ActionBar } from './ActionBar';
import type { ActionBarCell, ActionBarSize } from './ActionBar';
import type { ActionIcon } from './ActionButton';

/**
 * One option of a general menu bar: skills, menu entries, choices.
 * The bar has no selection semantics — each option is a button.
 */
export type OptionSpec = {
    id: string;
    label: string;
    icon?: ActionIcon;
    tone?: 'default' | 'primary' | 'danger';
    disabled?: boolean;
    disabledReason?: string;
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
}: {
    options: OptionSpec[];
    size?: ActionBarSize;
    back?: { label?: string; onClick: () => void };
    // The last option is pinned to the final grid slot (6 in lg).
    pinLast?: boolean;
}) {
    const cells: ActionBarCell[] = options.map((option) => ({
        id: option.id,
        label: option.label,
        icon: option.icon,
        tone: option.tone,
        disabled: option.disabled,
        disabledReason: option.disabledReason,
        onClick: option.onClick,
    }));

    return <ActionBar cells={cells} size={size} back={back} pinLast={pinLast} />;
}
