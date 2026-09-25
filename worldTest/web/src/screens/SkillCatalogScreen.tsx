import { DEFAULT_ELEMENTS, allSkillSpecs } from '@core';
import type { SkillSpec } from '@core';
import { useGame } from '../game/GameContext';

function specSummary(spec: SkillSpec): string {
    const parts: string[] = [];

    if (spec.damage) {
        const total = spec.damage.reduce((sum, component) => sum + component.amount, 0);
        const elements = spec.damage
            .map((component) => DEFAULT_ELEMENTS.get(component.element)?.name ?? component.element)
            .join(' + ');
        parts.push(`⚔️ ${Math.round(total)} (${elements})`);
    }
    if (spec.heal) parts.push(`💚 heal ${spec.heal}`);
    if (spec.statusOnSelf) parts.push(`self: ${spec.statusOnSelf.name}`);
    if (spec.statusOnTargets) parts.push(`targets: ${spec.statusOnTargets.name}`);
    if (spec.priority) parts.push(`priority ${spec.priority}`);

    if (spec.reaction) {
        const reaction = spec.reaction;
        const effects: string[] = [];
        if (reaction.negate) effects.push('negates the attack');
        effects.push(
            `reflects ${Math.round((reaction.reflectPercent ?? 0) * 100)}%${reaction.trueDamage ? ' as true damage' : ''}`,
        );
        if (reaction.chance !== undefined && reaction.chance < 100) effects.push(`${reaction.chance}% chance`);
        parts.push(`↩ ${effects.join(', ')}`);
    }

    return parts.join(' · ');
}

/**
 * Catalog of every skill defined in the skills constant file. The view
 * consumes the catalog directly: adding a skill to the constant is all
 * it takes to appear here.
 */
export function SkillCatalogScreen() {
    const api = useGame();
    const specs = allSkillSpecs();

    return (
        <div className="screen">
            {specs.length === 0 ? (
                <div className="empty">No skills defined yet.</div>
            ) : (
                specs.map((spec) => (
                    <div key={spec.id} className="card" style={{ padding: 12 }}>
                        <div style={{ fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            {spec.name}
                            <span className="tag">{spec.targeting}</span>
                            {spec.reaction ? <span className="tag">↩ reactive</span> : null}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 12, margin: '4px 0' }}>{spec.description}</div>
                        <div style={{ color: 'var(--muted)', fontSize: 12 }}>{specSummary(spec)}</div>
                    </div>
                ))
            )}
            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
