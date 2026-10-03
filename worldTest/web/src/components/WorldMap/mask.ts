import { REGIONS } from './regions';
import { countryOfRegion } from './countries';

// The native logical resolution of the map art. Every coordinate in
// the map system lives in this space (the camera just moves over it).
export const MAP_WIDTH = 1696;
export const MAP_HEIGHT = 2032;

export type MaskData = {
    // Per-pixel region index + 1 (0 = transparent / unknown color).
    // regionIds[index - 1] is the region id.
    indexData: Uint8Array;
    regionIds: string[];
    // Per-pixel COUNTRY index + 1, DERIVED from the region index (each
    // country is the union of its regions in the region mask — no
    // country mask needed). countryIds[index - 1] is the country id.
    countryIndexData: Uint8Array;
    countryIds: string[];
};

/** Numeric RGB key: (r << 16) | (g << 8) | b. */
export function colorKey(r: number, g: number, b: number): number {
    return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

function hexToRgb(hex: string): [number, number, number] {
    const value = parseInt(hex.replace('#', ''), 16);
    return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

// Max acceptable |dr|+|dg|+|db| distance to a region color: lossy
// webp compression shifts flat colors by a few units.
const MAX_COLOR_DISTANCE = 45;

type RegionColor = { id: string; r: number; g: number; b: number };

/** Nearest region color within tolerance, or 0 when nothing matches. */
function nearestRegionIndex(r: number, g: number, b: number, colors: RegionColor[]): number {
    let best = 0;
    let bestDistance = Number.MAX_VALUE;
    for (let index = 0; index < colors.length; index++) {
        const color = colors[index];
        const distance = Math.abs(color.r - r) + Math.abs(color.g - g) + Math.abs(color.b - b);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = index + 1;
        }
    }
    return bestDistance <= MAX_COLOR_DISTANCE ? best : 0;
}

/** Loads an image (used for the mask and the reveal pass). */
export function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Could not load image: ${src}`));
        image.src = src;
    });
}

/**
 * Loads the region mask into an offscreen canvas once and flattens it
 * into per-pixel region AND country indexes (O(1) hit tests). Call
 * once; the component shares the cached promise.
 */
export async function loadMaskData(src: string): Promise<MaskData> {
    const image = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = MAP_WIDTH;
    canvas.height = MAP_HEIGHT;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D is not available.');
    ctx.drawImage(image, 0, 0, MAP_WIDTH, MAP_HEIGHT);
    const imageData = ctx.getImageData(0, 0, MAP_WIDTH, MAP_HEIGHT);

    const colors: RegionColor[] = REGIONS.map((region) => {
        const [r, g, b] = hexToRgb(region.maskColor);
        return { id: region.id, r, g, b };
    });
    const regionIds: string[] = ['', ...colors.map((color) => color.id)];

    // countryIds[i] = the country of regionIds[i] (index 0 = none), and
    // the country index for a region index.
    const countryIds: string[] = [''];
    const regionCountry: number[] = [0];
    const usedCountries: string[] = [];
    for (let index = 1; index < regionIds.length; index++) {
        const countryId = countryOfRegion(regionIds[index]);
        let countryIndex = usedCountries.indexOf(countryId ?? '') + 1;
        if (countryIndex === 0 && countryId) {
            usedCountries.push(countryId);
            countryIndex = usedCountries.length;
            countryIds.push(countryId);
        }
        regionCountry.push(countryIndex);
    }

    const total = MAP_WIDTH * MAP_HEIGHT;
    const indexData = new Uint8Array(total);
    const countryIndexData = new Uint8Array(total);
    const source = imageData.data;
    for (let pixel = 0; pixel < total; pixel++) {
        const offset = pixel * 4;
        if (source[offset + 3] === 0) continue;
        const regionIndex = nearestRegionIndex(source[offset], source[offset + 1], source[offset + 2], colors);
        indexData[pixel] = regionIndex;
        countryIndexData[pixel] = regionIndex === 0 ? 0 : regionCountry[regionIndex];
    }
    return { indexData, regionIds, countryIndexData, countryIds };
}

/** The region under a logical coordinate (O(1) index read). */
export function regionAt(mask: MaskData, x: number, y: number): string | null {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    if (xi < 0 || yi < 0 || xi >= MAP_WIDTH || yi >= MAP_HEIGHT) return null;
    const index = mask.indexData[yi * MAP_WIDTH + xi];
    return index === 0 ? null : mask.regionIds[index];
}

/** The country under a logical coordinate (O(1), derived index). */
export function countryAt(mask: MaskData, x: number, y: number): string | null {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    if (xi < 0 || yi < 0 || xi >= MAP_WIDTH || yi >= MAP_HEIGHT) return null;
    const index = mask.countryIndexData[yi * MAP_WIDTH + xi];
    return index === 0 ? null : mask.countryIds[index];
}
