import type { Character } from '@rpg';
import { SPRITES, spriteRoleOf } from '../assets/sprites';
import type { SpriteAnimation, SpriteRole } from '../assets/sprites';

/**
 * One fighter shown on the battlefield (the card fichas): the screen
 * snapshot of a character — id, name, sprite, row, hp, level. Screens
 * build it through battleUnitOf instead of mapping fields by hand.
 */
export type BattleUnit = {
    id: string;
    name: string;
    icon?: string;
    // The unit's animation set (idle + attack): the card renders the
    // frames from the sprite data, never from a hardcoded sheet size.
    sprite?: SpriteAnimation;
    attackSprite?: SpriteAnimation;
    row: 'front' | 'center' | 'back';
    hp: number;
    maxHp: number;
    // The barrier is a battle-scoped pool, separate from HP.
    barrier?: number;
    level?: number;
    // While true the ficha plays the one-shot attack animation.
    attacking?: boolean;
    // Extra line under the hp (reach, statuses...).
    sub?: string;
};

/** The formation row of a character's position. */
function rowOfPosition(character: Character): BattleUnit['row'] {
    return character.position === 'center' || character.position === 'back' ?
        character.position :
        'front';
}

/**
 * The battlefield snapshot of a character. The row comes from the
 * character's position; a screen may override the sprite role (the dev
 * stress page uses custom roles) or the row.
 */
export function battleUnitOf(
    character: Character,
    overrides?: { role?: SpriteRole; row?: BattleUnit['row'] },
): BattleUnit {
    const role = overrides?.role ?? spriteRoleOf(character) ?? 'warrior';
    return {
        id: character.id,
        name: character.name,
        sprite: SPRITES[role].idle,
        attackSprite: SPRITES[role].attack,
        row: overrides?.row ?? rowOfPosition(character),
        hp: Math.round(character.stats.hp),
        maxHp: Math.round(character.stats.totalHp),
        barrier: Math.round(character.vitals.barrier),
        level: character.experience.level,
    };
}
