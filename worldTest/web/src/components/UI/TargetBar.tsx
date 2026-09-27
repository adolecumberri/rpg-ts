import { ActionBar } from './ActionBar';
import type { ActionBarCell, ActionBarSize } from './ActionBar';
import type { ActionIcon } from './ActionButton';
import { isValidSelection } from '../../game/targeting';
import type { SelectionRules } from '../../game/targeting';

/** A pickable target: character or enemy. */
export type TargetSpec = {
    id: string;
    label: string;
    icon?: ActionIcon;
    // Attack reach: unreachable targets render dimmed and disabled
    // with an "out of reach" reason instead of disappearing.
    reachable?: boolean;
};

/**
 * The target-selection bar: all the "if the skill is X behave like Y"
 * logic lives here — marks (✓ / ✓×N), locked pre-filled panels,
 * disabled cells at the cap, and the floating Accept once the
 * selection is valid. The screen owns the selection state and the
 * commit; the rules come from game/targeting.
 */
export function TargetBar({
    targets,
    rules,
    selection,
    size = 'md',
    onToggle,
    onAccept,
    onCancel,
}: {
    targets: TargetSpec[];
    rules: SelectionRules;
    selection: string[];
    size?: ActionBarSize;
    onToggle: (id: string) => void;
    onAccept: () => void;
    onCancel: () => void;
}) {
    const multiHit = rules.kind === 'multiHit';
    const prefilled = rules.kind === 'prefilled';

    const cells: ActionBarCell[] = targets.map((target) => {
        const picked = selection.indexOf(target.id) !== -1;
        const hits = selection.filter((entry) => entry === target.id).length;
        const full = selection.length >= rules.max;
        const outOfReach = target.reachable === false;
        return {
            id: target.id,
            label: target.label,
            icon: target.icon,
            selected: picked,
            mark: multiHit && hits > 0 ? `✓×${hits}` : picked ? '✓' : undefined,
            disabled: prefilled || outOfReach || (!multiHit && !picked && full),
            disabledReason: outOfReach
                ? 'out of reach'
                : prefilled ? 'locked' : `max ${rules.max} targets`,
            onClick: prefilled ? undefined : () => onToggle(target.id),
        };
    });

    const accept = isValidSelection(selection, rules)
        ? { label: 'Accept', onClick: onAccept }
        : undefined;

    return (
        <ActionBar
            cells={cells}
            size={size}
            back={{ label: 'Cancel', onClick: onCancel }}
            accept={accept}
        />
    );
}
