import type { SkillSpec } from '@core';
import { skillCostLabel, skillEffectSummary } from '@core';
import './SkillInfo.css';

/**
 * The skill info panel: the inferior part of the middle container in
 * the character section's skills view. Shows the selected skill's
 * description, its mana cost and the same effect summary the battle
 * tooltips use (the stat changes, turns included).
 */
export function SkillInfo({ spec }: { spec?: SkillSpec }) {
    if (!spec) {
        return (
            <div className="skill-info skill-info--empty">
                Select a skill to see its data.
            </div>
        );
    }
    return (
        <div className="skill-info">
            <div className="skill-info-name">{spec.name}</div>
            <div className="skill-info-desc">{spec.description}</div>
            <div className="skill-info-row">{skillCostLabel(spec)}</div>
            <div className="skill-info-row">{skillEffectSummary(spec)}</div>
        </div>
    );
}
