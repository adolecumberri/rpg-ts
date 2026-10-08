// Fixed values for the story portraits: an id resolves to its asset.
// Unknown or missing ids fall back to the warrior portrait (the
// default profile picture).
import type { Character } from '@rpg';
import { heldJobOf } from '@core';
import archerPortrait from '../../../assets/portraits/archer.webp';
import magePortrait from '../../../assets/portraits/mage.webp';
import soldierPortrait from '../../../assets/portraits/soldier.webp';

export const PORTRAIT_URLS: Record<string, string> = {
    warrior: soldierPortrait,
    archer: archerPortrait,
    mage: magePortrait,
};

export function portraitUrl(id?: string): string {
    if (id && PORTRAIT_URLS[id]) return PORTRAIT_URLS[id];
    return soldierPortrait;
}

/**
 * The portrait key of a character: the override stamped at creation
 * (special characters keep their own picture) or, without one, the
 * held job's portrait — archers show the archer portrait, the healer
 * (the mage class) shows the mage one, everyone else the warrior.
 */
export function portraitIdOf(character: Character): string {
    if (character.portraitId) return character.portraitId;
    const jobId = heldJobOf(character)?.id;
    if (jobId === 'archer') return 'archer';
    if (jobId === 'healer') return 'mage';
    return 'warrior';
}
