// Place artwork. Content sets a place's `image` as a key (not a URL,
// the world does not know web paths); this registry resolves the key
// to the bundled asset. Unknown or missing keys fall back to the
// groceries art, the default place image.
import groceriesPlace from '../../../assets/groceries-pixel-art-320x200-px-v0-moqmtdttkrs11.png';

export const DEFAULT_PLACE_IMAGE = groceriesPlace;

const PLACE_IMAGES: Record<string, string> = {
    groceries: groceriesPlace,
};

/** The bundled image for a place's `image` key, or the default art. */
export function placeImageOf(image?: string): string {
    return image ? PLACE_IMAGES[image] ?? DEFAULT_PLACE_IMAGE : DEFAULT_PLACE_IMAGE;
}
