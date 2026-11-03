import type { SkillSpec } from '@core';
import { skillCostLabel, skillEffectSummary } from '@core';
import { Icon } from '../chrome/Icon';
import { highlightDefinition } from '../../game/definitionText';
import './SkillInfo.css';

/**
 * The effect summary with the structured pieces the UI knows how to
 * render: a trailing "N turns" becomes the turn icon + N (the rest stays
 * plain text, separated by middots).
 */
function EffectSummary({ text }: { text: string }) {
    const parts = text.split(' · ');
    return (
        <div className="skill-info-row skill-info-effect">
            {parts.map((part, index) => {
                const turns = /^(\d+) turns?$/.exec(part);
                return (
                    <span className="skill-info-effect-part" key={`${part}-${index}`}>
                        {index > 0 ? <span className="skill-info-effect-sep"> · </span> : null}
                        {turns ? (
                            <>
                                <Icon id="turn" size={3} />
                                <span>{turns[1]}</span>
                            </>
                        ) : part}
                    </span>
                );
            })}
        </div>
    );
}

/**
 * One block of skill info: the name, the colored description (the
 * definition mark language: [physical]…[/physical], [mana]…, …), the
 * mana cost (with the mana icon) and the effect summary. The summary is
 * skipped when it would repeat the description (skills whose only
 * payload is their text).
 */
function SkillBlock({ spec }: { spec: SkillSpec }) {
    const mana = spec.manaCost ?? 0;
    const summary = skillEffectSummary(spec).trim();
    const repeated = summary !== '' && summary === (spec.description ?? '').trim();
    return (
        <>
            <div className="skill-info-head">
                <span className="skill-info-name">{spec.name}</span>
                <span className="skill-info-cost-inline">
                    {mana > 0 || spec.hpCostPercent || spec.requiresShield ? (
                        <>
                            <Icon id="mana" size={4} />
                            <span className="skill-info-mana">{mana}</span>
                            {spec.hpCostPercent ? (
                                <span> · {spec.hpCostPercent}% HP</span>
                            ) : null}
                            {spec.requiresShield ? <span> · shield</span> : null}
                        </>
                    ) : (
                        <span className="skill-info-cost-free">{skillCostLabel(spec)}</span>
                    )}
                </span>
            </div>
            <div className="skill-info-desc">{highlightDefinition(spec.description)}</div>
            {summary !== '' && !repeated ? <EffectSummary text={summary} /> : null}
        </>
    );
}

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
            <SkillBlock spec={spec} />
            {nextSpec ? (
                <div className="skill-info-next">
                    <div className="skill-info-next-title">
                        {rankFrom !== undefined && rankTo !== undefined ?
                            `Lv.${rankFrom} → Lv.${rankTo}` :
                            'Enhanced'}
                    </div>
                    <SkillBlock spec={nextSpec} />
                </div>
            ) : null}
        </div>
    );
}
