// The character sprites: each role owns an idle loop and an attack
// swing — horizontal sheets of 16x16 frames, imported so Vite resolves
// and serves them from the repo assets.
import type { Character } from '@rpg';
import { heldJobOf } from '@core';
import archerIdle from '../../../assets/characters/archer_idle.webp';
import archerAttack from '../../../assets/characters/archer_attack.webp';
import mageIdle from '../../../assets/characters/mage_idle.webp';
import mageAttack from '../../../assets/characters/mage_attack.webp';
import warriorIdle from '../../../assets/characters/warrior_idle.webp';
import warriorAttack from '../../../assets/characters/warrior_attack.webp';

// One animation: a horizontal strip of frames. The total play time is
// frames x frameMs — the battle scheduler waits for it.
export type SpriteAnimation = {
    sheet: string;
    frames: number;
    frameWidth: number;
    frameHeight: number;
    frameMs: number;
};

export type SpriteSet = {
    idle: SpriteAnimation;
    attack: SpriteAnimation;
};

/** The total play time of an animation (frames × frameMs). */
export function animationMsOf(animation: SpriteAnimation): number {
    return animation.frames * animation.frameMs;
}

export const SPRITES: Record<'archer' | 'mage' | 'warrior', SpriteSet> = {
    archer: {
        idle: { sheet: archerIdle, frames: 4, frameWidth: 16, frameHeight: 16, frameMs: 180 },
        attack: { sheet: archerAttack, frames: 4, frameWidth: 16, frameHeight: 16, frameMs: 110 },
    },
    mage: {
        idle: { sheet: mageIdle, frames: 4, frameWidth: 16, frameHeight: 16, frameMs: 180 },
        attack: { sheet: mageAttack, frames: 4, frameWidth: 16, frameHeight: 16, frameMs: 110 },
    },
    warrior: {
        idle: { sheet: warriorIdle, frames: 4, frameWidth: 16, frameHeight: 16, frameMs: 180 },
        attack: { sheet: warriorAttack, frames: 4, frameWidth: 16, frameHeight: 16, frameMs: 110 },
    },
};

export type SpriteRole = keyof typeof SPRITES;

// A job renders with its class sprite (roster/team screens show the
// idle loop): soldier → warrior, healer → mage, etc.
export const JOB_SPRITE_ROLES: Record<string, SpriteRole> = {
    soldier: 'warrior',
    archer: 'archer',
    healer: 'mage',
    adventurer: 'warrior',
};

export function spriteRoleOfJob(jobId?: string): SpriteRole | undefined {
    return jobId ? JOB_SPRITE_ROLES[jobId] : undefined;
}

/**
 * The sprite role of a character: the picture override stamped at
 * creation (special characters keep their own sprite) or, without one,
 * the held job's role — soldier → warrior, healer → mage, etc.
 */
export function spriteRoleOf(character: Character): SpriteRole | undefined {
    const override = character.portraitId;
    if (override === 'archer' || override === 'mage' || override === 'warrior') {
        return override;
    }
    return spriteRoleOfJob(heldJobOf(character)?.id);
}
