// Fixed values for the story portraits: an id resolves to its asset.
// Unknown or missing ids fall back to the warrior portrait (the
// default profile picture).
import soldierPortrait from '../../../assets/portraits/soldier.webp';

export const PORTRAIT_URLS: Record<string, string> = {
    warrior: soldierPortrait,
};

export function portraitUrl(id?: string): string {
    if (id && PORTRAIT_URLS[id]) return PORTRAIT_URLS[id];
    return soldierPortrait;
}
