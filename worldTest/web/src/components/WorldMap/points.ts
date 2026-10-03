import mapCirclesSrc from '../../../../assets/maps/icons/map_circles.webp';

/**
 * The map points of interest: interactive dots over the map (later:
 * click → travel there / spawn missions). The circle is already
 * painted in the art; the sprite is drawn again ON TOP so each dot
 * can react (hover frame + click callback).
 */
export type MapPoint = {
    id: string;
    name: string;
    // The region the point belongs to: it only shows while that
    // region is discovered.
    regionId: string;
    // Circle center, in native 1696x2032 coordinates.
    x: number;
    y: number;
};

// The shared sprite sheet: 32x16 = two 16x16 frames (normal, hover).
// If the frames are swapped in the file, flip `hoverX` to 0 and the
// normal frame to 16.
export const POINT_SPRITE = { src: mapCirclesSrc, size: 16, hoverX: 16 };

export const MAP_POINTS: MapPoint[] = [
    {
        id: 'fergel_east_1',
        name: 'Point 1',
        regionId: 'fergel_este',
        x: 1360,
        y: 1596,
    },
    {
        id: 'fergel_east_2',
        name: 'Point 2',
        regionId: 'fergel_este',
        x: 1391,
        y: 1506,
    },
    {
        id: 'fergel_east_3',
        name: 'Point 3',
        regionId: 'fergel_este',
        x: 1418,
        y: 1670,
    },
];
