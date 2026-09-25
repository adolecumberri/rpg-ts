// Fixed values for the story portraits: an id resolves to its asset.
// Unknown or missing ids fall back to the general portrait.
import defaultPortrait from '../../../assets/portraits/default_portrait.webp';

export const PORTRAIT_URLS: Record<string, string> = {
    default: defaultPortrait,
};

export function portraitUrl(id?: string): string {
    if (id && PORTRAIT_URLS[id]) return PORTRAIT_URLS[id];
    return defaultPortrait;
}
