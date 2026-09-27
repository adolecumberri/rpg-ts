// The character sprites (64x16 sheets, 4 idle frames of 16x16 side by
// side), imported so Vite resolves and serves them from the repo assets.
import archerIdle from '../../../assets/characters/archer_idle.webp';
import mageIdle from '../../../assets/characters/mage_idle.webp';
import warriorIdle from '../../../assets/characters/warrior_idle.webp';

export const SPRITES = {
    archer: archerIdle,
    mage: mageIdle,
    warrior: warriorIdle,
} as const;

export type SpriteRole = keyof typeof SPRITES;
