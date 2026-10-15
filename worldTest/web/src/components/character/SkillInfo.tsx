import type { SkillSpec } from '@core';
import { skillCostLabel, skillEffectSummary } from '@core';
import './SkillInfo.css';

/**
 * The skill info panel: the inferior part of the middle container in
 * the character section's skills view. Shows the selected skill's
 * description, its cost and the same effect summary the battle
 * tooltips use. When the enhanced rank is passed (the job level-up
 * comparison), its info renders below a divider so the player can
 * compare before committing the pick.
 */
export function SkillInfo({
    spec,
    nextSpec,
    rankFrom,
    rankTo,
}: {
    spec?: SkillSpec;
    // The enhanced rank of the selected skill: the comparison section.
    nextSpec?: SkillSpec;
    rankFrom?: number;
    rankTo?: number;
}) {
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
            {nextSpec ? (
                <div className="skill-info-next">
                    <div className="skill-info-next-title">
                        {rankFrom !== undefined && rankTo !== undefined ?
                            `Lv.${rankFrom} → Lv.${rankTo}` :
                            'Enhanced'}
                    </div>
                    <div className="skill-info-name">{nextSpec.name}</div>
                    <div className="skill-info-desc">{nextSpec.description}</div>
                    <div className="skill-info-row">{skillCostLabel(nextSpec)}</div>
                    <div className="skill-info-row">{skillEffectSummary(nextSpec)}</div>
                </div>
            ) : null}
        </div>
    );
}
