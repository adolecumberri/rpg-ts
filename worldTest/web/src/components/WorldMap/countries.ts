import type { IconId } from '../UI/Icon';
import { COUNTRY_ENABLED } from './flags';
import { COUNTRY_IDS } from './ids';
import type { CountryId } from './ids';
import { REGIONS } from './regions';
import fergelImg from '../../../../assets/maps/icons/fergel.webp';
import timbretImg from '../../../../assets/maps/icons/timbret.webp';

/**
 * The countries. A country has NO mask of its own: its area is the
 * union of its regions in the region mask, so the country index is
 * DERIVED from the region mask at load (see mask.ts).
 */
export type CountryData = {
    id: CountryId;
    name: string;
    description: string;
    icon: IconId;
    // False = clicking the country does nothing.
    selectable?: boolean;
    // Where the camera centers when the country is selected.
    camera?: { x: number; y: number; zoom: number };
    // Anchor of the country's map image (its center, 1696x2032 space).
    position: { x: number; y: number };
    // Optional country image drawn on the map (countries band), at its
    // natural size, centered on `position`. The image is keyed by the
    // id, NOT by the display name: `fergel.webp`, `timbret.webp`, ...
    image?: { src: string };
};

const ALL_COUNTRIES: CountryData[] = [
    {
        id: COUNTRY_IDS.fergel,
        name: 'Fergel',
        description: 'Placeholder description for Fergel.',
        icon: 'default',
        // Center of the country's bounding box in the region mask.
        camera: { x: 1072, y: 1632, zoom: 0.5 },
        position: { x: 1072, y: 1632 },
        image: { src: fergelImg },
    },
    {
        id: COUNTRY_IDS.timbret,
        name: 'Timbret',
        description: 'Placeholder description for Timbret.',
        icon: 'default',
        // Center of the country's bounding box in the region mask.
        camera: { x: 464, y: 1568, zoom: 0.5 },
        position: { x: 464, y: 1568 },
        image: { src: timbretImg },
    },
];

/**
 * The active countries: a country behind a disabled flag in flags.ts
 * is hidden from the map while its data stays in ALL_COUNTRIES for
 * the future.
 */
export const COUNTRIES: CountryData[] = ALL_COUNTRIES.filter(
    (country) => COUNTRY_ENABLED[country.id],
);

export const COUNTRY_BY_ID: Record<CountryId, CountryData> = COUNTRIES.reduce(
    (acc: Record<CountryId, CountryData>, country) => {
        acc[country.id] = country;
        return acc;
    },
    {} as Record<CountryId, CountryData>,
);

/** The country a region belongs to. */
export function countryOfRegion(regionId: string): string | null {
    const region = REGIONS.find((entry) => entry.id === regionId);
    return region ? region.countryId : null;
}
