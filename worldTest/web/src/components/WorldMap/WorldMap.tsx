import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import aguaNubesSrc from '../../../../assets/maps/agua_nubes.webp';
import mapaSrc from '../../../../assets/maps/mapa.webp';
import regionMaskSrc from '../../../../assets/maps/mapa_detalles.webp';
import indicatorSrc from '../../../../assets/maps/icons/map_indicator.webp';
import { REGIONS, REGION_BY_ID } from './regions';
import type { RegionData } from './regions';
import { MAP_PLACES, MARKER_SPRITE } from './mapPlaces';
import type { MapPlace } from './mapPlaces';
import type { RegionId } from './ids';
import { MAP_WIDTH, MAP_HEIGHT, loadImage, loadMaskData, regionAt } from './mask';
import type { MaskData } from './mask';
import './WorldMap.css';

const SELECT_RGB: [number, number, number] = [245, 185, 66];
// The selected map place highlight: #f7b750.
const PLACE_SELECT_RGB: [number, number, number] = [247, 183, 80];

// The zoom ladder: fine steps both out (the whole map at 0.2) and in
// (small jumps near the 6x maximum, so one wheel notch never leaps).
const ZOOM_LEVELS = [
    0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8,
    1, 1.2, 1.4, 1.6, 1.8,
    2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6,
];
const MIN_ZOOM = ZOOM_LEVELS[0];
const MAX_ZOOM = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
const snapZoom = (zoom: number): number => {
    const clamped = clampZoom(zoom);
    let best = ZOOM_LEVELS[0];
    let bestDistance = Number.MAX_VALUE;
    for (const level of ZOOM_LEVELS) {
        const distance = Math.abs(level - clamped);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = level;
        }
    }
    return best;
};
const steppedZoom = (zoom: number, direction: number): number => {
    let index = 0;
    let bestDistance = Number.MAX_VALUE;
    for (let i = 0; i < ZOOM_LEVELS.length; i++) {
        const distance = Math.abs(ZOOM_LEVELS[i] - zoom);
        if (distance < bestDistance) {
            bestDistance = distance;
            index = i;
        }
    }
    const next = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, index + direction));
    return ZOOM_LEVELS[next];
};
// Pixels a pointer must travel before a tap becomes a drag.
const DRAG_THRESHOLD = 4;
// Accumulated wheel delta that steps the zoom by one.
const WHEEL_STEP = 120;

// The zoom bands, with ASYMMETRIC (hysteresis) thresholds like some
// Pokémon maps: zooming INTO the details needs a higher zoom than
// zooming back OUT, so sitting at the boundary never flickers when the
// player keeps zooming around it (anti zoom-spam). Only two bands now:
// regions (far) and details (close).
const DETAILS_LEAVE_ZOOM = 0.7; // details -> regions (zooming out)
const DETAILS_ENTER_ZOOM = 0.8; // regions -> details (zooming in)

type Band = 'regions' | 'details';

/** The band after a zoom change, applying the asymmetric thresholds. */
function nextBand(current: Band, zoom: number): Band {
    if (zoom >= DETAILS_ENTER_ZOOM) return 'details';
    if (zoom <= DETAILS_LEAVE_ZOOM) return 'regions';
    return current;
}

// Duration of the one-shot crossfade between two band arts.
const BAND_FADE_MS = 450;

// Duration of the hover fade-in/fade-out on a region.
const HOVER_FADE_MS = 200;

// Selecting a region fits it on screen: the zoom that makes the region
// image fill this fraction of the viewport (0.9 = 10% breathing room).
const REGION_FIT_MARGIN = 0.9;

type Camera = { x: number; y: number; zoom: number };

// The player starts at the Order Camp: the camera opens on its map
// place (data-driven, so moving the camp in mapPlaces.ts follows).
const START_PLACE = MAP_PLACES.find((place) => place.placeId === 'camp');
const DEFAULT_CAMERA: Camera = {
    x: START_PLACE ? START_PLACE.x : MAP_WIDTH / 2,
    y: START_PLACE ? START_PLACE.y : MAP_HEIGHT / 2,
    zoom: 1,
};

type Point = { x: number; y: number };

type Gesture =
    | {
        type: 'pan';
        pointerId: number;
        start: Point;
        camX: number;
        camY: number;
        moved: boolean;
    }
    | {
        type: 'pinch';
        startDist: number;
        startZoom: number;
        startMid: Point;
        startT: Point;
        startW: number;
        startH: number;
    };

// The mask is cached at module level: loaded once per session and
// shared by every WorldMap instance (never reloaded on re-render).
let maskCache: Promise<MaskData> | null = null;

function cachedMask(): Promise<MaskData> {
    if (!maskCache) {
        maskCache = loadMaskData(regionMaskSrc);
    }
    return maskCache;
}

// Band art drawn once into offscreen canvases: the reveal pass clips
// the band's art with the discovered mask.
const revealCaches = new Map<string, Promise<HTMLCanvasElement>>();

function cachedReveal(src: string): Promise<HTMLCanvasElement> {
    let cached = revealCaches.get(src);
    if (!cached) {
        cached = loadImage(src).then((image) => {
            const canvas = document.createElement('canvas');
            canvas.width = MAP_WIDTH;
            canvas.height = MAP_HEIGHT;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas 2D is not available.');
            // 1:1 draw: the art is exported at the native map size, so
            // no resampling keeps it pixel perfect.
            ctx.drawImage(image, 0, 0);
            return canvas;
        });
        revealCaches.set(src, cached);
    }
    return cached;
}

/**
 * One band's revealed art: the band art clipped by the discovered
 * pixels of its mask (a temp canvas is needed because putImageData
 * ignores the globalCompositeOperation).
 */
function clipReveal(
    art: HTMLCanvasElement,
    indexData: Uint8Array,
    ids: string[],
    discovered: Set<string>,
): HTMLCanvasElement {
    const out = document.createElement('canvas');
    out.width = MAP_WIDTH;
    out.height = MAP_HEIGHT;
    const ctx = out.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available.');
    const alpha = ctx.createImageData(MAP_WIDTH, MAP_HEIGHT);
    const total = MAP_WIDTH * MAP_HEIGHT;
    for (let pixel = 0; pixel < total; pixel++) {
        const index = indexData[pixel];
        const revealed = index !== 0 && discovered.has(ids[index]);
        const offset = pixel * 4;
        alpha.data[offset] = 255;
        alpha.data[offset + 1] = 255;
        alpha.data[offset + 2] = 255;
        alpha.data[offset + 3] = revealed ? 255 : 0;
    }
    const temp = document.createElement('canvas');
    temp.width = MAP_WIDTH;
    temp.height = MAP_HEIGHT;
    const tempCtx = temp.getContext('2d');
    if (!tempCtx) throw new Error('Canvas 2D is not available.');
    tempCtx.putImageData(alpha, 0, 0);
    ctx.drawImage(art, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(temp, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    return out;
}

/**
 * Draws the reveal layer as a TRUE crossfade: `from` at weight
 * (1 - progress) and `to` at weight `progress` (both over the
 * parchment below). Steady state is progress 0 with from === to.
 * Weights are needed because one side may be mostly transparent (e.g.
 * the regions art when almost nothing is discovered): stacking the
 * destination over a full-alpha source would freeze the picture until
 * the final hard cut.
 */
function drawReveal(
    canvas: HTMLCanvasElement | null,
    revealed: Partial<Record<Band, HTMLCanvasElement>>,
    from: Band,
    to: Band,
    progress: number,
) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    if (progress <= 0) {
        const fromArt = revealed[from];
        if (fromArt) ctx.drawImage(fromArt, 0, 0);
        return;
    }
    if (progress >= 1) {
        const toArt = revealed[to];
        if (toArt) ctx.drawImage(toArt, 0, 0);
        return;
    }
    const fromArt = revealed[from];
    const toArt = revealed[to];
    if (fromArt) {
        ctx.globalAlpha = 1 - progress;
        ctx.drawImage(fromArt, 0, 0);
    }
    if (toArt) {
        ctx.globalAlpha = progress;
        ctx.drawImage(toArt, 0, 0);
    }
    ctx.globalAlpha = 1;
}

// Overlay images (region/country art and cloud sprites), loaded lazily
// and cached.
const mapImageCaches = new Map<string, Promise<HTMLImageElement>>();

function cachedMapImage(src: string): Promise<HTMLImageElement> {
    let cached = mapImageCaches.get(src);
    if (!cached) {
        cached = loadImage(src);
        mapImageCaches.set(src, cached);
    }
    return cached;
}

/** A tinted copy of an image (its own silhouette filled with a color). */
function tintCanvas(
    image: HTMLImageElement,
    rgb: [number, number, number],
    alpha: number,
): HTMLCanvasElement {
    const temp = document.createElement('canvas');
    temp.width = image.naturalWidth;
    temp.height = image.naturalHeight;
    const tempCtx = temp.getContext('2d');
    if (!tempCtx) throw new Error('Canvas 2D is not available.');
    tempCtx.drawImage(image, 0, 0);
    tempCtx.globalCompositeOperation = 'source-atop';
    tempCtx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha / 255})`;
    tempCtx.fillRect(0, 0, temp.width, temp.height);
    return temp;
}

/**
 * A hover/selection target: an image tinted on the overlay canvas.
 * `center` anchors it on its center (region art), otherwise on its
 * top-left (cloud sprites).
 */
type TintTarget = { src: string; x: number; y: number; center: boolean };

/** A tinted image ready to draw: the canvas plus its anchor. */
type TintFrame = { canvas: HTMLCanvasElement; left: number; top: number };

/** Loads and tints a target image (missing images become null). */
async function buildTintFrame(
    target: TintTarget,
    rgb: [number, number, number],
    alpha: number,
): Promise<TintFrame | null> {
    try {
        const image = await cachedMapImage(target.src);
        const left = target.center ? target.x - Math.floor(image.naturalWidth / 2) : target.x;
        const top = target.center ? target.y - Math.floor(image.naturalHeight / 2) : target.y;
        return { canvas: tintCanvas(image, rgb, alpha), left, top };
    } catch {
        return null;
    }
}

/** Draws tinted frames at a weight (0..1). */
function drawFrames(ctx: CanvasRenderingContext2D, frames: TintFrame[], weight: number) {
    if (weight <= 0) return;
    ctx.globalAlpha = weight;
    for (const frame of frames) {
        ctx.drawImage(frame.canvas, frame.left, frame.top);
    }
    ctx.globalAlpha = 1;
}

/**
 * The regions band, composited from the per-region images: each region
 * is its own layer drawn at its position (centered on its mask box), so
 * every region keeps its own hover/selection silhouette and the band
 * rebuilds when the discovery state changes. No mapa_regiones art
 * needed.
 */
async function buildRegionsBand(discovered: Set<string>): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = MAP_WIDTH;
    canvas.height = MAP_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available.');
    for (const region of REGIONS) {
        if (!region.image || !discovered.has(region.id)) continue;
        try {
            const image = await cachedMapImage(region.image.src);
            ctx.drawImage(
                image,
                region.position.x - Math.floor(image.naturalWidth / 2),
                region.position.y - Math.floor(image.naturalHeight / 2),
            );
        } catch {
            // Missing image: the region stays fogged.
        }
    }
    return canvas;
}

/**
 * A map place's cut-out image, centered on its coordinates. It is NOT
 * interactive itself: taps and drags go to the viewport (so the map
 * can be dragged from anywhere) and the viewport hit-tests the place
 * on tap. Hidden until its size is known, so it never flickers at a
 * wrong position.
 */
function PlaceImage({ place, hovered }: { place: MapPlace; hovered: boolean }) {
    const [size, setSize] = useState<{ w: number; h: number } | null>(null);
    const image = place.image ?? '';
    return (
        <div
            className={`worldmap-location${hovered ? ' worldmap-location--hovered' : ''}`}
            style={size ?
                {
                    left: place.x - Math.floor(size.w / 2),
                    top: place.y - Math.floor(size.h / 2),
                    width: size.w,
                    height: size.h,
                } :
                { left: place.x, top: place.y, visibility: 'hidden' }}
        >
            <img
                className="worldmap-location-image"
                src={image}
                alt={place.name}
                onLoad={(event) => {
                    const measured = {
                        w: event.currentTarget.naturalWidth,
                        h: event.currentTarget.naturalHeight,
                    };
                    locationSizes.set(image, measured);
                    setSize(measured);
                }}
            />
        </div>
    );
}

/**
 * The "you are here" indicator: drawn over the location of the
 * current place. Purely visual (pointer-events disabled).
 */
function IndicatorMarker({ x, y }: { x: number; y: number }) {
    const [size, setSize] = useState<{ w: number; h: number } | null>(null);
    return (
        <div
            className="worldmap-indicator"
            style={size ?
                {
                    left: x - Math.floor(size.w / 2),
                    top: y - Math.floor(size.h),
                    width: size.w,
                    height: size.h,
                } :
                { left: x, top: y, visibility: 'hidden' }}
        >
            <img
                className="worldmap-indicator-image"
                src={indicatorSrc}
                alt="You are here"
                onLoad={(event) => {
                    const image = event.currentTarget;
                    setSize({ w: image.naturalWidth, h: image.naturalHeight });
                }}
            />
        </div>
    );
}

/** Natural sizes of the location images, reported on load (used by
    the viewport's tap/hover hit-testing). */
const locationSizes = new Map<string, { w: number; h: number }>();

/** Translucent overlay over the pixels whose index matches the target. */
function drawOverlay(
    ctx: CanvasRenderingContext2D,
    indexData: Uint8Array,
    ids: string[],
    targetId: string,
    rgb: [number, number, number],
    fillAlpha: number,
    withOutline: boolean,
) {
    ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    const total = MAP_WIDTH * MAP_HEIGHT;
    const targetIndex = ids.indexOf(targetId);
    if (targetIndex === -1) return;
    const isTarget = new Uint8Array(total);
    for (let pixel = 0; pixel < total; pixel++) {
        if (indexData[pixel] === targetIndex) isTarget[pixel] = 1;
    }
    const out = ctx.createImageData(MAP_WIDTH, MAP_HEIGHT);
    const data = out.data;
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const pixel = y * MAP_WIDTH + x;
            if (!isTarget[pixel]) continue;
            // Outline: any 4-neighbor (or the map border) outside the target.
            const onEdge = withOutline && (
                (x === 0 || !isTarget[pixel - 1]) ||
                (x === MAP_WIDTH - 1 || !isTarget[pixel + 1]) ||
                (y === 0 || !isTarget[pixel - MAP_WIDTH]) ||
                (y === MAP_HEIGHT - 1 || !isTarget[pixel + MAP_WIDTH])
            );
            const offset = pixel * 4;
            data[offset] = rgb[0];
            data[offset + 1] = rgb[1];
            data[offset + 2] = rgb[2];
            data[offset + 3] = onEdge ? 235 : fillAlpha;
        }
    }
    ctx.putImageData(out, 0, 0);
}

const drawRegionOverlay = (
    ctx: CanvasRenderingContext2D,
    mask: MaskData,
    regionId: string,
    rgb: [number, number, number],
    fillAlpha: number,
    withOutline: boolean,
) => drawOverlay(ctx, mask.indexData, mask.regionIds, regionId, rgb, fillAlpha, withOutline);

const HOVER_RGB: [number, number, number] = [0, 0, 0];

const distBetween = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

const midOf = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export type WorldMapProps = {
    discoveredRegions: RegionId[];
    selectedRegion: RegionId | null;
    onRegionSelect?: (regionId: RegionId | null) => void;
    onRegionEnter?: (regionId: RegionId | null) => void;
    onRegionLeave?: (regionId: RegionId | null) => void;
    // Clicking a map place (its image and/or its marker).
    onMapPlaceClick?: (placeId: string) => void;
    // The selected map place: highlighted on the map in #f7b750.
    selectedPlaceId?: string | null;
    // The game place the party is in ('farm', 'camp', ...): its
    // location gets the "you are here" indicator.
    currentLocationId?: string | null;
    // The places reachable from the current one: unreachable places
    // show the third circle frame. Null = all places look reachable.
    reachablePlaceIds?: Set<string> | null;
    // Hidden places (not discovered yet): not drawn and not clickable.
    hiddenPlaceIds?: Set<string> | null;
    // Clicking an undiscovered target: 'ignore' (default) does nothing;
    // 'select' selects it but keeps its info hidden.
    undiscovered?: 'ignore' | 'select';
};

/**
 * The FFTA2-style world map over the real art, with two zoom bands:
 * far out shows the regions (composited from the per-region images),
 * close up shows the detailed place art (mapa). Controls: wheel zoom
 * (anchored at the cursor), drag to pan, two-finger pinch. The dev
 * button (top right) opens a panel with the live mouse coordinates
 * and the layer toggles.
 */
export function WorldMap({
    discoveredRegions,
    selectedRegion,
    onRegionSelect,
    onRegionEnter,
    onRegionLeave,
    onMapPlaceClick,
    selectedPlaceId = null,
    currentLocationId = null,
    reachablePlaceIds = null,
    hiddenPlaceIds = null,
    undiscovered = 'ignore',
}: WorldMapProps) {
    const [mask, setMask] = useState<MaskData | null>(null);
    const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA);
    const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
    // Bumped after the per-band revealed canvases are (re)built, so the
    // crossfade redraws them onto the reveal layer.
    const [revealVersion, setRevealVersion] = useState(0);

    // Dev tool state.
    const [devOpen, setDevOpen] = useState(false);
    const [showMapa, setShowMapa] = useState(true);
    const [showMask, setShowMask] = useState(false);
    const [showSelection, setShowSelection] = useState(true);
    const [cursor, setCursor] = useState<{
        x: number;
        y: number;
        region: RegionId | null;
    } | null>(null);
    const [copied, setCopied] = useState(false);
    // The discovered target under the mouse (drives the hover overlay).
    const [hoverTarget, setHoverTarget] = useState<RegionId | null>(null);
    // The map place under the mouse (drives its hover shadow).
    const [hoveredPlace, setHoveredPlace] = useState<string | null>(null);

    const viewportRef = useRef<HTMLDivElement | null>(null);
    const revealRef = useRef<HTMLCanvasElement | null>(null);
    // Precomputed revealed art per band (the crossfade just blends them).
    const revealedRef = useRef<Partial<Record<Band, HTMLCanvasElement>>>({});
    const selectionRef = useRef<HTMLCanvasElement | null>(null);
    const hoverCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const hoverRef = useRef<RegionId | null>(null);
    // The tinted frames currently shown on the hover canvas (the hover
    // fade animates from these to the new target's frames).
    const hoverFramesRef = useRef<TintFrame[]>([]);
    const cameraRef = useRef(camera);
    cameraRef.current = camera;
    const pointersRef = useRef(new Map<number, Point>());
    const gestureRef = useRef<Gesture | null>(null);
    const wheelAccRef = useRef(0);

    // Load (or reuse the cached) mask once.
    useEffect(() => {
        let alive = true;
        cachedMask().then((data) => {
            if (alive) setMask(data);
        });
        return () => {
            alive = false;
        };
    }, []);

    // Track the viewport size (resizing recomputes the transform).
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const update = () => setViewportSize({ w: viewport.clientWidth, h: viewport.clientHeight });
        update();
        const observer = new ResizeObserver(update);
        observer.observe(viewport);
        return () => observer.disconnect();
    }, []);

    // Mouse wheel: zoom by one ladder step, anchored at the cursor.
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            const accumulated = wheelAccRef.current + event.deltaY;
            const steps = Math.trunc(accumulated / WHEEL_STEP);
            if (steps === 0) {
                wheelAccRef.current = accumulated;
                return;
            }
            wheelAccRef.current = accumulated - steps * WHEEL_STEP;
            const direction = steps > 0 ? -1 : 1;
            for (let index = 0; index < Math.abs(steps); index++) {
                zoomAt(event.clientX, event.clientY, direction);
            }
        };
        viewport.addEventListener('wheel', onWheel, { passive: false });
        return () => viewport.removeEventListener('wheel', onWheel);
        // zoomAt only reads refs: safe to mount once.
    }, []);

    const discoveredRegionSet = new Set(discoveredRegions);

    // The current band is STATE, not a pure function of the zoom: the
    // asymmetric thresholds keep it stable around the boundaries.
    const [band, setBand] = useState<Band>(() => nextBand('regions', DEFAULT_CAMERA.zoom));
    // The one-shot crossfade in flight (from → to), if any.
    const [fade, setFade] = useState<{ from: Band; to: Band; start: number } | null>(null);
    const prevBandRef = useRef<Band>(band);

    // The band follows the zoom with hysteresis: crossing into a closer
    // band needs a higher zoom than crossing back out.
    useEffect(() => {
        setBand((current) => nextBand(current, camera.zoom));
    }, [camera.zoom]);

    // A band change runs ONE fixed crossfade between the two arts
    // (never a continuous blend tied to the zoom position).
    useEffect(() => {
        if (prevBandRef.current === band) return;
        const from = prevBandRef.current;
        prevBandRef.current = band;
        setFade({ from, to: band, start: performance.now() });
    }, [band]);

    // A selection only counts when the target is discovered.
    const effectiveRegion = selectedRegion && discoveredRegionSet.has(selectedRegion) ? selectedRegion : null;

    // Cloud mode: enabled when at least one region defines a cloud
    // sprite. The sprite IS the fog (and the hover/selection shape);
    // the square-tile mask then only does hit-testing.
    const hasClouds = REGIONS.some((region) => region.cloud);

    // Build the revealed art of the three bands once per mask /
    // discovery change. The REGIONS band is composited from the
    // per-region images (each region works as its own layer, with its
    // own hover); the COUNTRIES band always shows the whole known
    // world (fog applies at the region level).
    useEffect(() => {
        if (!mask || !showMapa) return;
        const build = (band: Band): Promise<HTMLCanvasElement> => {
            if (band === 'regions') return buildRegionsBand(discoveredRegionSet);
            return cachedReveal(mapaSrc).then((artCanvas) => {
                // Cloud mode: the fog comes from the per-region cloud
                // sprites, so the band art is revealed fully (the
                // fallback clips it with the discovered mask).
                return hasClouds ?
                    artCanvas :
                    clipReveal(artCanvas, mask.indexData, mask.regionIds, discoveredRegionSet);
            });
        };
        let alive = true;
        const bands: Band[] = ['regions', 'details'];
        let pending = bands.length;
        const built: Partial<Record<Band, HTMLCanvasElement>> = {};
        for (const band of bands) {
            build(band).then((artCanvas) => {
                if (!alive) return;
                built[band] = artCanvas;
                pending -= 1;
                if (pending === 0) {
                    revealedRef.current = built;
                    setRevealVersion((version) => version + 1);
                }
            });
        }
        return () => {
            alive = false;
        };
    }, [mask, discoveredRegions, showMapa, hasClouds]);

    // Steady-state reveal draw: whenever the precomputed band canvases
    // are rebuilt, the band changes or the layer visibility changes.
    // During a crossfade the animation loop below owns the drawing.
    useEffect(() => {
        if (fade) return;
        if (showMapa) drawReveal(revealRef.current, revealedRef.current, band, band, 0);
    }, [revealVersion, band, fade, showMapa]);

    // The one-shot crossfade animation: from the previous band's art to
    // the new band's art over BAND_FADE_MS.
    useEffect(() => {
        if (!fade || !showMapa) return;
        let raf = 0;
        const step = (now: number) => {
            const progress = Math.min(1, (now - fade.start) / BAND_FADE_MS);
            drawReveal(revealRef.current, revealedRef.current, fade.from, fade.to, progress);
            if (progress < 1) {
                raf = requestAnimationFrame(step);
            } else {
                setFade(null);
            }
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [fade, showMapa]);

    // Selection: tints the selected region's IMAGE (or cloud sprite)
    // with SELECT_RGB, and the SELECTED PLACE with PLACE_SELECT_RGB
    // (every band). The mask overlay is only the fallback for regions
    // without an image. The details band has no region-level
    // highlight, but the place highlight still shows there.
    useEffect(() => {
        const canvas = selectionRef.current;
        if (!canvas || !mask || !showSelection) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
        let alive = true;
        const work: Array<Promise<void>> = [];

        if (band === 'regions' && effectiveRegion) {
            const region = REGION_BY_ID[effectiveRegion];
            if (region) {
                const targets: TintTarget[] = [];
                if (region.cloud) {
                    targets.push({ src: region.cloud.src, x: region.cloud.x, y: region.cloud.y, center: false });
                } else if (region.image) {
                    targets.push({ src: region.image.src, x: region.position.x, y: region.position.y, center: true });
                }
                if (targets.length > 0) {
                    work.push(
                        Promise.all(targets.map((target) => buildTintFrame(target, SELECT_RGB, 70)))
                            .then((frames) => {
                                if (!alive) return;
                                drawFrames(ctx, frames.flatMap((frame) => (frame ? [frame] : [])), 1);
                            }),
                    );
                } else {
                    drawRegionOverlay(ctx, mask, effectiveRegion, SELECT_RGB, 70, true);
                }
            }
        }

        const selectedEntry = selectedPlaceId ?
            MAP_PLACES.find((entry) => entry.placeId === selectedPlaceId) :
            undefined;
        if (selectedEntry && selectedEntry.image) {
            work.push(
                buildTintFrame(
                    { src: selectedEntry.image, x: selectedEntry.x, y: selectedEntry.y, center: true },
                    PLACE_SELECT_RGB,
                    100,
                ).then((frame) => {
                    if (alive && frame) drawFrames(ctx, [frame], 1);
                }),
            );
        } else if (selectedEntry && selectedEntry.marker) {
            // No image: highlight the marker square itself.
            const half = MARKER_SPRITE.size / 2;
            ctx.fillStyle = `rgba(${PLACE_SELECT_RGB[0]}, ${PLACE_SELECT_RGB[1]}, ${PLACE_SELECT_RGB[2]}, 0.45)`;
            ctx.fillRect(
                selectedEntry.marker.x - half,
                selectedEntry.marker.y - half,
                MARKER_SPRITE.size,
                MARKER_SPRITE.size,
            );
        }

        // Run the async tints in order over the cleared canvas.
        work.reduce((chain, task) => chain.then(() => task), Promise.resolve()).catch(() => { });
        return () => {
            alive = false;
        };
    }, [mask, effectiveRegion, band, showSelection, selectedPlaceId]);

    // Hover overlay: a dark tint over the hovered region's image, with
    // a smooth crossfade (HOVER_FADE_MS) between targets. Regions band
    // only: the details band has no region-level hover.
    useEffect(() => {
        const canvas = hoverCanvasRef.current;
        if (!canvas || !mask) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const targets: TintTarget[] = [];
        if (band === 'regions' && hoverTarget) {
            const region = REGION_BY_ID[hoverTarget];
            if (region) {
                if (region.cloud) {
                    targets.push({ src: region.cloud.src, x: region.cloud.x, y: region.cloud.y, center: false });
                } else if (region.image) {
                    targets.push({ src: region.image.src, x: region.position.x, y: region.position.y, center: true });
                }
            }
        }
        let alive = true;
        let raf = 0;
        const previous = hoverFramesRef.current;
        Promise.all(targets.map((target) => buildTintFrame(target, HOVER_RGB, 70)))
            .then((built) => {
                if (!alive) return;
                const next = built.flatMap((frame) => (frame ? [frame] : []));
                const start = performance.now();
                const step = (now: number) => {
                    const progress = Math.min(1, (now - start) / HOVER_FADE_MS);
                    ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
                    if (progress < 1) drawFrames(ctx, previous, 1 - progress);
                    if (progress > 0) drawFrames(ctx, next, progress);
                    if (progress < 1) {
                        raf = requestAnimationFrame(step);
                    } else {
                        hoverFramesRef.current = next;
                    }
                };
                raf = requestAnimationFrame(step);
            })
            .catch(() => { });
        return () => {
            alive = false;
            cancelAnimationFrame(raf);
        };
    }, [mask, hoverTarget, band]);

    // Selecting a region FITS it on screen: the camera centers on the
    // region and zooms so its image fills the viewport with a small
    // margin. Keyed on the selection VALUE only: zoom band changes
    // never recenter.
    useEffect(() => {
        if (!effectiveRegion) return;
        const region = REGION_BY_ID[effectiveRegion];
        if (!region || !region.image) return;
        const viewport = viewportRef.current;
        if (!viewport || viewport.clientWidth === 0) return;
        let alive = true;
        cachedMapImage(region.image.src).then((image) => {
            if (!alive) return;
            const current = viewportRef.current;
            if (!current) return;
            const fit = Math.min(
                current.clientWidth / image.naturalWidth,
                current.clientHeight / image.naturalHeight,
            ) * REGION_FIT_MARGIN;
            setCamera({ x: region.position.x, y: region.position.y, zoom: clampZoom(fit) });
        }).catch(() => { });
        return () => {
            alive = false;
        };
    }, [effectiveRegion]);

    // Band changes invalidate the hover (it is band-scoped).
    useEffect(() => {
        hoverRef.current = null;
        setHoverTarget(null);
    }, [band]);

    // Pointer -> viewport-local coordinates.
    const viewportPoint = (clientX: number, clientY: number): Point | null => {
        const viewport = viewportRef.current;
        if (!viewport) return null;
        const rect = viewport.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    // Screen -> raw logical (unclamped: the dev panel wants the exact
    // native coordinates even outside the map bounds).
    const rawLogical = (clientX: number, clientY: number): Point | null => {
        const point = viewportPoint(clientX, clientY);
        const viewport = viewportRef.current;
        if (!point || !viewport) return null;
        const rect = viewport.getBoundingClientRect();
        const current = cameraRef.current;
        const tx = rect.width / 2 - current.x * current.zoom;
        const ty = rect.height / 2 - current.y * current.zoom;
        return {
            x: (point.x - tx) / current.zoom,
            y: (point.y - ty) / current.zoom,
        };
    };

    const regionUnder = (clientX: number, clientY: number): RegionId | null => {
        if (!mask) return null;
        const logical = rawLogical(clientX, clientY);
        if (!logical) return null;
        return regionAt(mask, logical.x, logical.y);
    };

    /** The map place under a screen point (its image rect or marker). */
    const mapPlaceAt = (clientX: number, clientY: number): MapPlace | null => {
        const logical = rawLogical(clientX, clientY);
        if (!logical) return null;
        for (const place of MAP_PLACES) {
            if (place.regionId && !discoveredRegionSet.has(place.regionId)) continue;
            if (hiddenPlaceIds && hiddenPlaceIds.has(place.placeId)) continue;
            if (place.image) {
                const size = locationSizes.get(place.image);
                if (size) {
                    const halfW = Math.floor(size.w / 2);
                    const halfH = Math.floor(size.h / 2);
                    if (
                        logical.x >= place.x - halfW &&
                        logical.x <= place.x + (size.w - halfW) &&
                        logical.y >= place.y - halfH &&
                        logical.y <= place.y + (size.h - halfH)
                    ) {
                        return place;
                    }
                }
            }
            if (place.marker) {
                const half = MARKER_SPRITE.size / 2;
                if (
                    logical.x >= place.marker.x - half &&
                    logical.x <= place.marker.x + half &&
                    logical.y >= place.marker.y - half &&
                    logical.y <= place.marker.y + half
                ) {
                    return place;
                }
            }
        }
        return null;
    };

    const updateHover = (clientX: number, clientY: number) => {
        const hovered = mapPlaceAt(clientX, clientY);
        // Unreachable places get no hover shadow: they must not look
        // selectable.
        const hoverable = hovered !== null &&
            (!reachablePlaceIds || reachablePlaceIds.has(hovered.placeId));
        setHoveredPlace(hoverable ? hovered.placeId : null);
        // The details band is below the region level: no hover at all.
        if (band === 'details') {
            const previous = hoverRef.current;
            hoverRef.current = null;
            if (previous !== null) onRegionLeave?.(previous);
            setHoverTarget(null);
            return;
        }
        const id = regionUnder(clientX, clientY);
        if (id === hoverRef.current) return;
        if (hoverRef.current !== null) onRegionLeave?.(hoverRef.current);
        hoverRef.current = id;
        if (id !== null) onRegionEnter?.(id);
        // Only DISCOVERED targets get the visual hover overlay.
        setHoverTarget(id !== null && discoveredRegionSet.has(id) ? id : null);
    };

    const updateCursor = (clientX: number, clientY: number) => {
        if (!devOpen) return;
        const logical = rawLogical(clientX, clientY);
        if (!logical) return;
        setCursor({
            x: Math.round(logical.x),
            y: Math.round(logical.y),
            region: mask ? regionAt(mask, logical.x, logical.y) : null,
        });
    };

    const selectAt = (clientX: number, clientY: number) => {
        // The details band is below the region level: no selection.
        if (band === 'details') return;
        const id = regionUnder(clientX, clientY);
        if (!id) return;
        const region = REGION_BY_ID[id];
        if (region && region.selectable === false) return;
        if (!discoveredRegionSet.has(id) && undiscovered !== 'select') return;
        onRegionSelect?.(id);
    };

    const startPan = (pointerId: number, point: Point) => {
        gestureRef.current = {
            type: 'pan',
            pointerId,
            start: point,
            camX: cameraRef.current.x,
            camY: cameraRef.current.y,
            moved: false,
        };
    };

    const handleDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        const point = viewportPoint(event.clientX, event.clientY);
        if (!point) return;
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            // pointer capture unsupported: the viewport still receives moves.
        }
        pointersRef.current.set(event.pointerId, point);
        const pointers = pointersRef.current;
        if (pointers.size === 1) {
            startPan(event.pointerId, point);
        } else if (pointers.size === 2) {
            const [a, b] = Array.from(pointers.values());
            const viewport = viewportRef.current;
            const w = viewport ? viewport.clientWidth : 0;
            const h = viewport ? viewport.clientHeight : 0;
            const current = cameraRef.current;
            gestureRef.current = {
                type: 'pinch',
                startDist: distBetween(a, b) || 1,
                startZoom: current.zoom,
                startMid: midOf(a, b),
                startT: { x: w / 2 - current.x * current.zoom, y: h / 2 - current.y * current.zoom },
                startW: w,
                startH: h,
            };
        }
    };

    const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        updateCursor(event.clientX, event.clientY);
        // Hover feedback (mouse with no buttons, no active fingers).
        if (event.pointerType === 'mouse' && event.buttons === 0 && pointersRef.current.size === 0) {
            updateHover(event.clientX, event.clientY);
            return;
        }
        const point = viewportPoint(event.clientX, event.clientY);
        if (!point) return;
        const pointers = pointersRef.current;
        if (!pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, point);

        const gesture = gestureRef.current;
        if (!gesture) return;

        if (gesture.type === 'pan') {
            const dx = point.x - gesture.start.x;
            const dy = point.y - gesture.start.y;
            if (!gesture.moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
                gesture.moved = true;
            }
            if (gesture.moved) {
                const zoom = cameraRef.current.zoom;
                setCamera((current) => ({
                    ...current,
                    x: gesture.camX - dx / zoom,
                    y: gesture.camY - dy / zoom,
                }));
            }
            return;
        }

        // Pinch: zoom by the distance ratio and pan by the midpoint,
        // keeping the logical point under the starting midpoint stable.
        const [a, b] = Array.from(pointers.values());
        const dist = distBetween(a, b);
        const mid = midOf(a, b);
        const zoom = clampZoom(gesture.startZoom * (dist / gesture.startDist));
        const lx = (gesture.startMid.x - gesture.startT.x) / gesture.startZoom;
        const ly = (gesture.startMid.y - gesture.startT.y) / gesture.startZoom;
        const tx = mid.x - lx * zoom;
        const ty = mid.y - ly * zoom;
        setCamera({
            x: (gesture.startW / 2 - tx) / zoom,
            y: (gesture.startH / 2 - ty) / zoom,
            zoom,
        });
    };

    const handleUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        const pointers = pointersRef.current;
        pointers.delete(event.pointerId);
        const gesture = gestureRef.current;
        if (!gesture) return;

        if (gesture.type === 'pan' && gesture.pointerId === event.pointerId) {
            if (!gesture.moved) {
                // A tap hits, in order: a map place, a region.
                const place = mapPlaceAt(event.clientX, event.clientY);
                if (place) {
                    // Unreachable places have their click disabled.
                    if (reachablePlaceIds && !reachablePlaceIds.has(place.placeId)) return;
                    onMapPlaceClick?.(place.placeId);
                    return;
                }
                selectAt(event.clientX, event.clientY);
            }
            if (pointers.size === 1) {
                const [pointerId, point] = Array.from(pointers.entries())[0];
                startPan(pointerId, point);
                return;
            }
            gestureRef.current = null;
            return;
        }

        if (gesture.type === 'pinch') {
            if (pointers.size === 1) {
                const [pointerId, point] = Array.from(pointers.entries())[0];
                startPan(pointerId, point);
                return;
            }
            if (pointers.size === 0) {
                gestureRef.current = null;
                // Snap back onto the zoom ladder after the pinch.
                setCamera((current) => ({
                    ...current,
                    zoom: snapZoom(current.zoom),
                }));
            }
        }
    };

    const handleLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
        pointersRef.current.delete(event.pointerId);
        if (pointersRef.current.size === 0) {
            gestureRef.current = null;
            if (hoverRef.current !== null) {
                onRegionLeave?.(hoverRef.current);
                hoverRef.current = null;
            }
            setHoverTarget(null);
            setHoveredPlace(null);
        }
    };

    /** One zoom ladder step (+1 or -1) anchored at a screen point. */
    const zoomAt = (clientX: number, clientY: number, direction: number) => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        const sx = clientX - rect.left;
        const sy = clientY - rect.top;
        const current = cameraRef.current;
        const zoom = steppedZoom(current.zoom, direction);
        if (zoom === current.zoom) return;
        const tx = rect.width / 2 - current.x * current.zoom;
        const ty = rect.height / 2 - current.y * current.zoom;
        const lx = (sx - tx) / current.zoom;
        const ly = (sy - ty) / current.zoom;
        setCamera({
            x: (rect.width / 2 - (sx - lx * zoom)) / zoom,
            y: (rect.height / 2 - (sy - ly * zoom)) / zoom,
            zoom,
        });
    };

    const copyCoords = () => {
        if (!cursor) return;
        const text = `${cursor.x}, ${cursor.y}`;
        navigator.clipboard.writeText(text).then(
            () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
            },
            () => setCopied(false),
        );
    };

    const tx = viewportSize.w / 2 - camera.x * camera.zoom;
    const ty = viewportSize.h / 2 - camera.y * camera.zoom;
    const worldStyle = { transform: `translate(${tx}px, ${ty}px) scale(${camera.zoom})` };

    const devToggles: Array<{ label: string; value: boolean; onToggle: () => void }> = [
        { label: 'mapa', value: showMapa, onToggle: () => setShowMapa((v) => !v) },
        { label: 'mask', value: showMask, onToggle: () => setShowMask((v) => !v) },
        { label: 'selección', value: showSelection, onToggle: () => setShowSelection((v) => !v) },
    ];

    return (
        <div className="worldmap pixel-font">
            <div
                className="worldmap-viewport"
                ref={viewportRef}
                onPointerDown={handleDown}
                onPointerMove={handleMove}
                onPointerUp={handleUp}
                onPointerCancel={handleUp}
                onPointerLeave={handleLeave}
            >
                <div className="worldmap-world" style={worldStyle}>
                    <img
                        className="worldmap-layer worldmap-layer--nubes"
                        src={aguaNubesSrc}
                        alt="Water with clouds"
                    />
                    {showMapa ? (
                        <canvas
                            ref={revealRef}
                            className="worldmap-layer worldmap-layer--reveal"
                            width={MAP_WIDTH}
                            height={MAP_HEIGHT}
                        />
                    ) : null}
                    {hasClouds ? (
                        REGIONS.flatMap((region) => {
                            if (!region.cloud || discoveredRegionSet.has(region.id)) return [];
                            return [
                                <img
                                    key={region.id}
                                    className="worldmap-layer worldmap-cloud"
                                    src={region.cloud.src}
                                    alt=""
                                    style={{ left: region.cloud.x, top: region.cloud.y }}
                                />,
                            ];
                        })
                    ) : null}
                    {MAP_PLACES.flatMap((place) => {
                        if (place.regionId && !discoveredRegionSet.has(place.regionId)) return [];
                        if (hiddenPlaceIds && hiddenPlaceIds.has(place.placeId)) return [];
                        const nodes: ReactNode[] = [];
                        if (place.image) {
                            nodes.push(
                                <PlaceImage
                                    key={`${place.placeId}-image`}
                                    place={place}
                                    hovered={hoveredPlace === place.placeId}
                                />,
                            );
                        }
                        if (place.marker) {
                            const reachable = !reachablePlaceIds || reachablePlaceIds.has(place.placeId);
                            nodes.push(
                                <div
                                    key={`${place.placeId}-marker`}
                                    className="worldmap-point"
                                    style={{
                                        left: place.marker.x - MARKER_SPRITE.size / 2,
                                        top: place.marker.y - MARKER_SPRITE.size / 2,
                                        backgroundImage: `url(${MARKER_SPRITE.src})`,
                                        backgroundPosition: reachable ?
                                            '0 0' :
                                            `-${MARKER_SPRITE.unreachableX}px 0`,
                                    }}
                                />,
                            );
                        }
                        return nodes;
                    })}
                    {MAP_PLACES.flatMap((place) => {
                        if (currentLocationId === null || place.placeId !== currentLocationId) return [];
                        // The indicator sits on the place's marker.
                        const anchor = place.marker ?? { x: place.x, y: place.y };
                        return [<IndicatorMarker key={place.placeId} x={anchor.x} y={anchor.y} />];
                    })}
                    {showSelection ? (
                        <canvas
                            ref={selectionRef}
                            className="worldmap-layer worldmap-layer--selection"
                            width={MAP_WIDTH}
                            height={MAP_HEIGHT}
                        />
                    ) : null}
                    <canvas
                        ref={hoverCanvasRef}
                        className="worldmap-layer worldmap-layer--hover"
                        width={MAP_WIDTH}
                        height={MAP_HEIGHT}
                    />
                    {showMask ? (
                        <img
                            className="worldmap-layer worldmap-layer--mask"
                            src={regionMaskSrc}
                            alt="Region mask"
                        />
                    ) : null}
                </div>

                <button
                    type="button"
                    className="worldmap-dev-button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setDevOpen((v) => !v)}
                >
                    🧭
                </button>
                {devOpen ? (
                    <div
                        className="worldmap-dev-panel"
                        onPointerDown={(event) => event.stopPropagation()}
                    >
                        <div className="worldmap-dev-coords">
                            {cursor ? `${cursor.x}, ${cursor.y}` : '—, —'}
                        </div>
                        <div className="worldmap-dev-region">
                            {cursor ? (cursor.region ?? '—') : '—'}
                        </div>
                        <button
                            type="button"
                            className="pixel-btn"
                            style={{ height: 'var(--s8)' }}
                            onClick={copyCoords}
                        >
                            {copied ? '✓ copied' : '📋 Copy coords'}
                        </button>
                        <div className="worldmap-dev-toggles">
                            {devToggles.map((toggle) => (
                                <button
                                    key={toggle.label}
                                    type="button"
                                    className={`pixel-btn${toggle.value ? ' pixel-btn--primary' : ''}`}
                                    style={{ height: 'var(--s8)' }}
                                    onClick={toggle.onToggle}
                                >
                                    {toggle.label} {toggle.value ? 'on' : 'off'}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>

        </div>
    );
}
