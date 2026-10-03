import type { IconId } from '../UI/Icon';
import { COUNTRY_ENABLED } from './flags';
import fergelOesteImg from '../../../../assets/maps/icons/fergel_oeste.webp';
import fergelSuroesteImg from '../../../../assets/maps/icons/fergel_suroeste.webp';
import fergelNorteImg from '../../../../assets/maps/icons/fergel_norte.webp';
import fergelCentroImg from '../../../../assets/maps/icons/fergel_centro.webp';
import fergelSuresteImg from '../../../../assets/maps/icons/fergel_sureste.webp';
import fergelEsteImg from '../../../../assets/maps/icons/fergel_este.webp';
import fergelIslasImg from '../../../../assets/maps/icons/fergel_islas.webp';
import timbretSuresteImg from '../../../../assets/maps/icons/timbret_sureste.webp';
import timbretNoresteImg from '../../../../assets/maps/icons/timbret_noreste.webp';
import timbretNoroesteImg from '../../../../assets/maps/icons/timbret_noroeste.webp';
import timbretSuroesteImg from '../../../../assets/maps/icons/timbret_suroeste.webp';

/**
 * Region data. The mask color is tied to the region mask (flat colors):
 * the lookup is built from these hex values. Positions and cameras are
 * the center of each region's bounding box in the 1696x2032 mask
 * (measured); names, icons and values are PLACEHOLDERS.
 *
 * `cloud` (optional): a per-region cloud sprite. When a region defines
 * one, the map switches to cloud mode: the sprite is the fog while the
 * region is undiscovered AND the silhouette used for hover/selection
 * (the square-tile mask is then only used for hit-testing). The sprite
 * is a small crop (cloud + transparent margin) placed at its native
 * coordinates: x/y are the sprite's top-left in the 1696x2032 space.
 */
export type RegionData = {
    id: string;
    // The country this region belongs to (see countries.ts).
    countryId: string;
    name: string;
    description: string;
    // Flat RGB of the region in the region mask.
    maskColor: string;
    value: number;
    icon: IconId;
    // Icon anchor, in native 1696x2032 logical coordinates.
    position: { x: number; y: number };
    // Camera the map centers on when the region is selected.
    camera: { x: number; y: number; zoom: number };
    // False = clicking the region does nothing.
    selectable?: boolean;
    // Per-region cloud sprite (see the doc above).
    cloud?: { src: string; x: number; y: number };
    // Optional region image drawn on the map (regions/details bands),
    // at its natural size, centered on `position`. Keyed by the id,
    // NOT by the display name: `fergel_oeste.webp`, ...
    image?: { src: string };
};

const ALL_REGIONS: RegionData[] = [
    // ---- Fergel ----
    {
        id: 'fergel_oeste',
        countryId: 'fergel',
        name: 'Oeste',
        description: 'Placeholder description for the fergel west.',
        maskColor: '#14ff00',
        value: 100,
        icon: 'default',
        position: { x: 744, y: 1592 },
        image: { src: fergelOesteImg },
        camera: { x: 744, y: 1592, zoom: 3 },
    },
    {
        id: 'fergel_suroeste',
        countryId: 'fergel',
        name: 'Suroeste',
        description: 'Placeholder description for the fergel south west.',
        maskColor: '#00ffd2',
        value: 100,
        icon: 'default',
        position: { x: 984, y: 1760 },
        image: { src: fergelSuroesteImg },
        camera: { x: 984, y: 1760, zoom: 3 },
    },
    {
        id: 'fergel_norte',
        countryId: 'fergel',
        name: 'Norte',
        description: 'Placeholder description for the fergel north.',
        maskColor: '#00d7ff',
        value: 100,
        icon: 'default',
        position: { x: 1096, y: 1512 },
        image: { src: fergelNorteImg },
        camera: { x: 1096, y: 1512, zoom: 3 },
    },
    {
        id: 'fergel_centro',
        countryId: 'fergel',
        name: 'Centro',
        description: 'Placeholder description for the fergel center.',
        maskColor: '#0076ff',
        value: 100,
        icon: 'default',
        position: { x: 1048, y: 1584 },
        image: { src: fergelCentroImg },
        camera: { x: 1048, y: 1584, zoom: 3 },
    },
    {
        id: 'fergel_sureste',
        countryId: 'fergel',
        name: 'Sureste',
        description: 'Placeholder description for the fergel south east.',
        maskColor: '#00ff6c',
        value: 100,
        icon: 'default',
        position: { x: 1200, y: 1648 },
        image: { src: fergelSuresteImg },
        camera: { x: 1200, y: 1648, zoom: 3 },
    },
    {
        id: 'fergel_este',
        countryId: 'fergel',
        name: 'Este',
        description: 'Placeholder description for the fergel east.',
        maskColor: '#98ff00',
        value: 100,
        icon: 'default',
        position: { x: 1384, y: 1632 },
        image: { src: fergelEsteImg },
        camera: { x: 1384, y: 1632, zoom: 3 },
    },
    {
        id: 'fergel_islas',
        countryId: 'fergel',
        name: 'Islas',
        description: 'Placeholder description for the fergel islands.',
        maskColor: '#e4ff00',
        value: 100,
        icon: 'default',
        position: { x: 1208, y: 1768 },
        image: { src: fergelIslasImg },
        camera: { x: 1208, y: 1768, zoom: 3 },
    },
    // ---- Timbret ----
    {
        id: 'timbret_sureste',
        countryId: 'timbret',
        name: 'Sureste',
        description: 'Placeholder description for the timbret south east.',
        maskColor: '#b800ff',
        value: 200,
        icon: 'default',
        position: { x: 600, y: 1624 },
        image: { src: timbretSuresteImg },
        camera: { x: 600, y: 1624, zoom: 3 },
    },
    {
        id: 'timbret_noreste',
        countryId: 'timbret',
        name: 'Noreste',
        description: 'Placeholder description for the timbret north east.',
        maskColor: '#7000ff',
        value: 200,
        icon: 'default',
        position: { x: 568, y: 1432 },
        image: { src: timbretNoresteImg },
        camera: { x: 568, y: 1432, zoom: 3 },
    },
    {
        id: 'timbret_noroeste',
        countryId: 'timbret',
        name: 'Noroeste',
        description: 'Placeholder description for the timbret north west.',
        maskColor: '#3400ff',
        value: 200,
        icon: 'default',
        position: { x: 368, y: 1424 },
        image: { src: timbretNoroesteImg },
        camera: { x: 368, y: 1424, zoom: 3 },
    },
    {
        id: 'timbret_suroeste',
        countryId: 'timbret',
        name: 'Suroeste',
        description: 'Placeholder description for the timbret south west.',
        maskColor: '#ff00f5',
        value: 200,
        icon: 'default',
        position: { x: 440, y: 1688 },
        image: { src: timbretSuroesteImg },
        camera: { x: 440, y: 1688, zoom: 3 },
    },
];

/**
 * The active regions: a region whose country is disabled in flags.ts
 * is hidden from the map (including the mask lookup) while its data
 * stays in ALL_REGIONS for the future.
 */
export const REGIONS: RegionData[] = ALL_REGIONS.filter(
    (region) => COUNTRY_ENABLED[region.countryId],
);

export const REGION_BY_ID: Record<string, RegionData> = REGIONS.reduce(
    (acc: Record<string, RegionData>, region) => {
        acc[region.id] = region;
        return acc;
    },
    {},
);
