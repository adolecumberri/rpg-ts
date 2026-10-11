import { ActionBar } from './ActionBar';
import type { ActionBarCell, ActionBarSize } from './ActionBar';
import type { ActionIcon } from './ActionButton';
import { CombatForecastCard } from './CombatForecast';
import type { ForecastCombatant } from './CombatForecast';
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
 * disabled cells at the cap, and the Accept once the selection is
 * valid. The screen owns the selection state and the commit; the rules
 * come from game/targeting.
 *
 * Forecast mode (the arena's small battles): the bar becomes the
 * forecast's bottom tray — the attacker and defender cards occupy the
 * first two places, the enemy list the next two, Cancel sits in place
 * 5 and the green Accept in place 6.
 */
export function TargetBar({
    targets,
    rules,
    selection,
    size = 'md',
    forecast,
    onToggle,
    onAccept,
    onCancel,
}: {
    targets: TargetSpec[];
    rules: SelectionRules;
    selection: string[];
    size?: ActionBarSize;
    // The matchup cards pinned to places 1 and 2 (the target screen's
    // phase 2: a target is already picked, so the enemy cells below
    // only list the others if the caller passes them). defenderIsEnemy
    // flips the defender card's colors (ALLy-targeting skills pick a
    // friendly defender).
    forecast?: { attacker: ForecastCombatant; defender: ForecastCombatant; defenderIsEnemy?: boolean };
    onToggle: (id: string) => void;
    onAccept: () => void;
    onCancel: () => void;
}) {
    const multiHit = rules.kind === 'multiHit';
    const prefilled = rules.kind === 'prefilled';

    // In forecast mode the two cards claim places 1 and 2, so only the
    // first two non-selected enemies render as cells (places 3 and 4);
    // the rest stay reachable through the arena sprites.
    let pool = targets;
    if (forecast && targets.length > 2) {
        pool = targets.filter((target) => target.id !== selection[0]).slice(0, 2);
    }

    const cells: ActionBarCell[] = [];
    if (forecast) {
        cells.push(
            { id: 'fc-attacker', label: '', slot: 1, custom: <CombatForecastCard combatant={forecast.attacker} cell /> },
            {
                id: 'fc-defender',
                label: '',
                slot: 2,
                custom: <CombatForecastCard combatant={forecast.defender} enemy={forecast.defenderIsEnemy ?? true} cell />,
            },
        );
    }
    for (const target of pool) {
        const picked = selection.indexOf(target.id) !== -1;
        const hits = selection.filter((entry) => entry === target.id).length;
        const full = selection.length >= rules.max;
        const outOfReach = target.reachable === false;
        cells.push({
            id: target.id,
            label: target.label,
            icon: target.icon,
            selected: picked,
            mark: multiHit && hits > 0 ? `✓×${hits}` : picked ? '✓' : undefined,
            disabled: prefilled || outOfReach || (!multiHit && !picked && full),
            disabledReason: outOfReach ? 'out of reach' :
                prefilled ? 'locked' : `max ${rules.max} targets`,
            onClick: prefilled ? undefined : () => onToggle(target.id),
        });
    }

    // Forecast mode: the Accept is a regular green cell pinned to
    // place 6 (the design's tray: cards 1+2, targets 3+4, cancel 5,
    // accept 6). The floating accept keeps serving the big battles.
    const valid = isValidSelection(selection, rules);
    if (forecast) {
        cells.push({
            id: 'accept',
            label: 'Accept',
            icon: '✓',
            tone: 'primary',
            disabled: !valid,
            disabledReason: 'Pick a target',
            onClick: onAccept,
        });
    }

    return (
        <ActionBar
            cells={cells}
            size={size}
            back={{ label: 'Cancel', onClick: onCancel }}
            pinLast={Boolean(forecast)}
            accept={!forecast && valid ? { label: 'Accept', onClick: onAccept } : undefined}
        />
    );
}
