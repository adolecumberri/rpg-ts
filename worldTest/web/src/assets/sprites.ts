// The character sprites: each role owns an idle loop and an attack
// swing — horizontal sheets of 16x16 frames, imported so Vite resolves
// and serves them from the repo assets.
import type { Character } from '@rpg';
import { heldJobOf } from '@core';
import archerIdle2 from '../../../assets/characters/archer_idle_2.webp';
import archerAttack from '../../../assets/characters/archer_attack.webp';
import mageIdle from '../../../assets/characters/mage_idle.webp';
import mageAttack from '../../../assets/characters/mage_attack.webp';
import warriorIdle2 from '../../../assets/characters/warrior_idle_2.webp';
import warriorAttack from '../../../assets/characters/warrior_attack.webp';
import cowSheet from '../../../assets/characters/cow.webp';

// One animation: a horizontal strip of frames. The total play time is
// frames x frameMs — the battle scheduler waits for it. `frameOffset`
// starts the animation mid-sheet (the cow shares one sheet between its
// idle and attack frames); `sheetFrames` is the FULL sheet's frame
// count when the animation only uses part of it.
export type SpriteAnimation = {
    sheet: string;
    frames: number;
    frameWidth: number;
    frameHeight: number;
    frameMs: number;
    frameOffset?: number;
    sheetFrames?: number;
};

export type SpriteSet = {
    idle: SpriteAnimation;
    attack: SpriteAnimation;
};

/** The total play time of an animation (frames × frameMs). */
export function animationMsOf(animation: SpriteAnimation): number {
    return animation.frames * animation.frameMs;
}

export const SPRITES: Record<'archer' | 'mage' | 'warrior' | 'cow', SpriteSet> = {
    archer: {
        idle: { sheet: archerIdle2, frames: 2, frameWidth: 16, frameHeight: 16, frameMs: 200 },
        attack: { sheet: archerAttack, frames: 4, frameWidth: 16, frameHeight: 16, frameMs: 110 },
    },
    mage: {
        idle: { sheet: mageIdle, frames: 4, frameWidth: 16, frameHeight: 16, frameMs: 180 },
        attack: { sheet: mageAttack, frames: 4, frameWidth: 16, frameHeight: 16, frameMs: 110 },
    },
    warrior: {
        idle: { sheet: warriorIdle2, frames: 2, frameWidth: 16, frameHeight: 16, frameMs: 200 },
        attack: { sheet: warriorAttack, frames: 4, frameWidth: 16, frameHeight: 16, frameMs: 110 },
    },
    // The caza menor's cow: ONE 4-frame sheet — frames 1-2 idle,
    // frames 3-4 attack.
    cow: {
        idle: { sheet: cowSheet, frames: 2, frameOffset: 0, sheetFrames: 4, frameWidth: 16, frameHeight: 16, frameMs: 200 },
        attack: { sheet: cowSheet, frames: 2, frameOffset: 2, sheetFrames: 4, frameWidth: 16, frameHeight: 16, frameMs: 120 },
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
 * the held job's role — soldier → warrior, healer → mage, etc. Known
 * species override the job (the caza menor's cow).
 */
export function spriteRoleOf(character: Character): SpriteRole | undefined {
    const override = character.portraitId;
    if (override === 'archer' || override === 'mage' || override === 'warrior') {
        return override;
    }
    if (character.speciesId === 'cow') return 'cow';
    return spriteRoleOfJob(heldJobOf(character)?.id);
}
