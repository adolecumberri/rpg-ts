import type { Character } from '@rpg';
import { statusModifierSummary } from '@core';
import './StatusChips.css';

/**
 * The live status chips of one arena combatant (option A of the
 * design-stitch code_status_chips reference): a tiny pixel chip per
 * status over the unit's head — green bevel for buffs, red for
 * debuffs, the status's initial, its remaining turns, and a tooltip
 * on hover with the same text the action buttons use: only the stat
 * changes (the description when the status changes no stats).
 *
 * The chips only REPORT hovers through `onTip`: the arena renders a
 * single shared .ui-tooltip overlay outside the tier-scaled entity,
 * so the tooltip never inherits the entity's scale or filters.
 * Internal aura mirrors stay hidden: the aura holder's own chip
 * already tells the story.
 */
export function StatusChips({
    character,
    onTip,
}: {
    character: Character;
    onTip?: (tip: { text: string; anchor: Element } | null) => void;
}) {
    const chips = Array.from(character.statusManager.statuses.values())
        .filter((status) => !status.definition.auraSource)
        // The tray holds 3 chips per row, 2 rows max: the rest stay
        // visible through inspection instead of piling up.
        .slice(0, 6);
    if (chips.length === 0) return null;

    return (
        <div className="sc-chips">
            {chips.map((status) => {
                const definition = status.definition;
                const buff = definition.polarity !== 'negative';
                const turns = definition.duration.type === 'TEMPORAL' ?
                    definition.duration.value :
                    undefined;
                // The same text as the skill buttons: the stat changes
                // only (the chip's letter already names the status).
                const parts = statusModifierSummary(definition);
                const tip = parts.length > 0 ?
                    parts.join(' · ') :
                    definition.description ?? definition.name;
                return (
                    <span
                        key={status.id}
                        className={`sc-chip${buff ? ' sc-chip--buff' : ' sc-chip--debuff'}`}
                        onMouseEnter={(event) => onTip?.({ text: tip, anchor: event.currentTarget })}
                        onMouseLeave={() => onTip?.(null)}
                    >
                        <span className="sc-chip-letter">
                            {definition.name.charAt(0).toUpperCase()}
                        </span>
                        {turns !== undefined ? <span className="sc-chip-turns">{turns}</span> : null}
                    </span>
                );
            })}
        </div>
    );
}
