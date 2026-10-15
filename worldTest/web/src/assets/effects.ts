// The damage-kind effect defaults: the physical slash and the magical
// blast, played over the target while the action resolves. Skills
// stretch these with their custom time (SkillSpec.animationMs) and may
// later bring their own sheets.
import type { SkillSpec } from '@core';
import type { SpriteAnimation } from './sprites';
import autoAttack from '../../../assets/skills/auto_atttack.webp';
import pernoMagico from '../../../assets/skills/perno_magico.webp';

export const DEFAULT_EFFECTS: Record<'physical' | 'magical', SpriteAnimation> = {
    physical: { sheet: autoAttack, frames: 2, frameWidth: 25, frameHeight: 16, frameMs: 90 },
    magical: { sheet: pernoMagico, frames: 9, frameWidth: 48, frameHeight: 48, frameMs: 80 },
};

/**
 * The effect animation of an action of the given damage kind: the
 * default sheet, stretched to the skill's custom time (animationMs)
 * when the skill declares one.
 */
export function effectAnimationFor(
    spec: SkillSpec | undefined,
    kind: 'physical' | 'magical',
): SpriteAnimation {
    const base = DEFAULT_EFFECTS[kind];
    if (spec?.animationMs && spec.animationMs > 0) {
        return { ...base, frameMs: spec.animationMs / base.frames };
    }
    return base;
}
