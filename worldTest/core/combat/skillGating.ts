import type { Character } from '../../../src';
import type { SkillSpec } from '../skills';
import { loadoutOf } from '../equipment/loadout';

// ---------------------------------------------------------------------------
// Skill gating: what a fighter must pay or wear to use a skill, shared
// by the UI (disabling buttons with reasons), the manual engine gate
// (resolveManualSkill keeps the engine honest) and the auto planner's
// affordability filter. Costs: mana (flat) and an hp share (a percent
// of the user's TOTAL hp, at least 1). Requirements: a shield in the
// offhand slot.
// ---------------------------------------------------------------------------

/** The hp a skill costs its user right now (0 = no hp cost). */
export function hpCostOf(spec: SkillSpec, character: Character): number {
    const percent = spec.hpCostPercent ?? 0;
    if (percent <= 0) return 0;
    return Math.max(1, Math.round((percent / 100) * character.stats.totalHp));
}

/** Whether the bearer wears a shield (an item in the offhand slot). */
export function wearsShield(character: Character): boolean {
    return loadoutOf(character).holes.some(
        (item) => item?.definition.loadoutSlot === 'offhand',
    );
}

/** Whether the fighter can use the skill right now: mana, hp share
 *  (the payment must leave at least 1 hp) and the shield requirement. */
export function canAffordSkill(spec: SkillSpec, character: Character): boolean {
    if ((spec.manaCost ?? 0) > (character.stats.mana ?? 0)) return false;
    if (spec.hpCostPercent && character.stats.hp <= hpCostOf(spec, character)) return false;
    if (spec.requiresShield && !wearsShield(character)) return false;
    return true;
}

/** A short cost line for the UI ('16 MANA · 30% HP · shield' / 'Free'). */
export function skillCostLabel(spec: SkillSpec): string {
    const parts: string[] = [];
    const mana = spec.manaCost ?? 0;
    if (mana > 0) parts.push(`${mana} MANA`);
    if (spec.hpCostPercent) parts.push(`${spec.hpCostPercent}% HP`);
    if (spec.requiresShield) parts.push('shield');
    return parts.length > 0 ? parts.join(' · ') : 'Free';
}

/** Why the fighter cannot use the skill (undefined = usable). */
export function skillUnavailableReason(spec: SkillSpec, character: Character): string | undefined {
    if ((spec.manaCost ?? 0) > (character.stats.mana ?? 0)) {
        return `Needs ${spec.manaCost} MANA`;
    }
    if (spec.hpCostPercent && character.stats.hp <= hpCostOf(spec, character)) {
        return `Needs ${spec.hpCostPercent}% HP`;
    }
    if (spec.requiresShield && !wearsShield(character)) {
        return 'Needs a shield';
    }
    return undefined;
}
