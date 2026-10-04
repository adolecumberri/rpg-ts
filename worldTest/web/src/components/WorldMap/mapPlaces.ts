import mapCirclesSrc from '../../../../assets/maps/icons/map_circles.webp';
import fergelLordsPlaceSrc from '../../../../assets/maps/Places/Fergel_lords_place.webp';
import fergelFarmerCampSrc from '../../../../assets/maps/Places/fergel_farmer_camp.webp';
import fergelCampSrc from '../../../../assets/maps/Places/Fergel_Camp.webp';
import fergelNorthSettlementSrc from '../../../../assets/maps/Places/Fergel_north_settlement.webp';
import fergelFaroSrc from '../../../../assets/maps/Places/Fergel_faro.webp';
import { REGION_IDS } from './ids';
import type { RegionId } from './ids';

/**
 * The map places: ONE entry per place (the engine place id plus its
 * map presentation). The old split between "points" (the circle
 * markers) and "locations" (the cut-out images) is unified here:
 *
 * - `image` (optional): the place art cut from the map, centered on
 *   `x` / `y`.
 * - `marker` (optional): a circle marker drawn ABOVE the image at ITS
 *   OWN coordinates (they can differ from the image center). When
 *   undefined, no marker is drawn.
 *
 * The engine place ids live in worldTest/core/world.ts (PLACES):
 * 'farm', 'camp', 'hay_field'. Placeholder ids (north settlement,
 * faro) travel nowhere until the engine defines them: travel then
 * answers "You cannot travel there." on its own.
 */
export type MapPlace = {
    // The engine place id ('farm', ...) or a placeholder until it exists.
    placeId: string;
    // Display name (the engine name wins when the place exists).
    name: string;
    // Center of the place image on the map (1696x2032).
    x: number;
    y: number;
    // The cut-out art drawn on the map.
    image?: string;
    // Circle marker drawn above the image, at its own coordinates.
    marker?: { x: number; y: number };
    // The region the place belongs to: hidden while undiscovered.
    regionId?: RegionId;
};

// The shared circle sprite: 16x16 frames of the 48x16 sheet.
// Frame 1: normal · frame 3 (x=32): the place cannot be reached.
export const MARKER_SPRITE = { src: mapCirclesSrc, size: 16, unreachableX: 32 };

export const MAP_PLACES: MapPlace[] = [
    {
        placeId: 'farm',
        name: "Lord's Place",
        image: fergelLordsPlaceSrc,
        // TODO: verify this marker belongs to this place.
        marker: { x: 1358, y: 1596 },
        regionId: REGION_IDS.fergel_este,
        x: 1344,
        y: 1589,
    },
    {
        placeId: 'hay_field',
        name: 'Farmer Camp',
        image: fergelFarmerCampSrc,
        // TODO: verify this marker belongs to this place.
        marker: { x: 1417, y: 1671 },
        regionId: REGION_IDS.fergel_este,
        x: 1407,
        y: 1695,
    },
    {
        placeId: 'camp',
        name: 'Camp',
        image: fergelCampSrc,
        regionId: REGION_IDS.fergel_este,
        marker: { x: 1449, y: 1521 },
        x: 1470,
        y: 1510,
    },
    {
        // TODO: replace with the engine place id when it exists.
        placeId: 'fergel_north_settlement',
        name: 'North Settlement',
        image: fergelNorthSettlementSrc,
        // TODO: verify this marker belongs to this place.
        marker: { x: 1391, y: 1506 },
        regionId: REGION_IDS.fergel_este,
        x: 1383,
        y: 1503,
    },
    {
        // TODO: replace with the engine place id when it exists.
        placeId: 'fergel_faro',
        name: 'Faro',
        image: fergelFaroSrc,
        regionId: REGION_IDS.fergel_este,
        marker: { x: 1332, y: 1792 },
        x: 1318,
        y: 1790,
    },
    {
        placeId: 'playa_sur',
        name: 'Playa Sur',
        regionId: REGION_IDS.fergel_este,
        marker: { x: 1383, y: 1772 },
        x: 1385,
        y: 1776,
    },
    {
        placeId: 'east_field',
        name: 'East Field',
        regionId: REGION_IDS.fergel_este,
        marker: { x: 1462, y: 1612 },
        x: 1464,
        y: 1613,
    }
];
