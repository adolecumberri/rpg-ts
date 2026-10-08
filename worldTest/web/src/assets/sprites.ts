// The character sprites (64x16 sheets, 4 frames of 16x16 side by side),
// imported so Vite resolves and serves them from the repo assets. Each
// role owns its animation set: the idle loop and the attack swing.
import type { Character } from '@rpg';
import { heldJobOf } from '@core';
import archerIdle from '../../../assets/characters/archer_idle.webp';
import archerAttack from '../../../assets/characters/archer_attack.webp';
import mageIdle from '../../../assets/characters/mage_idle.webp';
import mageAttack from '../../../assets/characters/mage_attack.webp';
import warriorIdle from '../../../assets/characters/warrior_idle.webp';
import warriorAttack from '../../../assets/characters/warrior_attack.webp';

export type SpriteSet = {
    idle: string;
    attack: string;
};

export const SPRITES: Record<'archer' | 'mage' | 'warrior', SpriteSet> = {
    archer: { idle: archerIdle, attack: archerAttack },
    mage: { idle: mageIdle, attack: mageAttack },
    warrior: { idle: warriorIdle, attack: warriorAttack },
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
