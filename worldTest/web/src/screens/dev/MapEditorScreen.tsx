import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import mapaSrc from '../../../../assets/maps/mapa.webp';
import { MAP_PLACE_IDS, MAP_PLACES } from '../../components/WorldMap/mapPlaces';
import type { MapPlaceId } from '../../components/WorldMap/mapPlaces';
import { MAP_HEIGHT, MAP_WIDTH } from '../../components/WorldMap/mask';
import { Modal } from '../../components/chrome/Modal';
import './MapEditorScreen.css';

/**
 * Map route editor (dev only): places waypoints on the painted map and
 * links places through them. A route is created by clicking the origin
 * place, its waypoints and the destination place; the reverse route is
 * created at the same time. The edited data is kept live in the page,
 * autosaved to localStorage and downloadable as JSON.
 */

type Waypoint = {
    id: string;
    x: number;
    y: number;
};

type MapRoute = {
    id: string;
    from: MapPlaceId;
    to: MapPlaceId;
    via: string[];
};

type EditorData = {
    points: Waypoint[];
    routes: MapRoute[];
};

type Mode = 'idle' | 'add' | 'delete' | 'route';

type Draft = {
    from?: MapPlaceId;
    via: string[];
};

const STORAGE_KEY = 'rpg-map-editor-v1';
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const POINT_SIZE = 20;

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

function isMapPlaceId(value: unknown): value is MapPlaceId {
    return typeof value === 'string' && (MAP_PLACE_IDS as readonly string[]).includes(value);
}

function loadStored(): EditorData {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return { points: [], routes: [] };
        const parsed = JSON.parse(raw) as Partial<EditorData>;
        const points = Array.isArray(parsed.points) ?
            parsed.points.filter((entry): entry is Waypoint =>
                typeof entry?.id === 'string' && Number.isFinite(entry.x) && Number.isFinite(entry.y)) :
            [];
        const routes = Array.isArray(parsed.routes) ?
            parsed.routes.filter((entry): entry is MapRoute => {
                const route = entry as Partial<MapRoute>;
                return typeof route.id === 'string' &&
                    isMapPlaceId(route.from) &&
                    isMapPlaceId(route.to) &&
                    Array.isArray(route.via) &&
                    route.via.every((id) => typeof id === 'string');
            }) :
            [];
        return { points, routes };
    } catch {
        return { points: [], routes: [] };
    }
}

function saveStored(data: EditorData): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // The editor still works in-memory if storage is unavailable.
    }
}

/** The map coordinates of a place (its marker when present). */
function placePoint(placeId: MapPlaceId): { x: number; y: number } | undefined {
    const place = MAP_PLACES.find((entry) => entry.placeId === placeId);
    if (!place) return undefined;
    return place.marker ?? { x: place.x, y: place.y };
}

function placeName(placeId: MapPlaceId): string {
    return MAP_PLACES.find((entry) => entry.placeId === placeId)?.name ?? placeId;
}

function routePoints(route: MapRoute, points: Waypoint[]): { x: number; y: number }[] {
    const byId = new Map(points.map((point) => [point.id, point]));
    const start = placePoint(route.from);
    const end = placePoint(route.to);
    if (!start || !end) return [];
    const middle = route.via
        .map((id) => byId.get(id))
        .filter((point): point is Waypoint => Boolean(point));
    return [start, ...middle, end];
}

export function MapEditorScreen() {
    const initial = useMemo(loadStored, []);
    const [points, setPoints] = useState<Waypoint[]>(initial.points);
    const [routes, setRoutes] = useState<MapRoute[]>(initial.routes);
    const [mode, setMode] = useState<Mode>('idle');
    const [draft, setDraft] = useState<Draft>({ via: [] });
    const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
    const [openModal, setOpenModal] = useState<'tools' | 'lists' | 'data' | null>(null);
    const [message, setMessage] = useState('Pick a tool, then click the map.');
    const [zoom, setZoom] = useState(0.45);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const zoomRef = useRef(zoom);
    const panRef = useRef(pan);

    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);

    useEffect(() => {
        panRef.current = pan;
    }, [pan]);

    // Native non-passive wheel listener: the page must not scroll while
    // the cursor is over the map. React's synthetic wheel handler cannot
    // reliably prevent the page scroll.
    useEffect(() => {
        const node = viewportRef.current;
        if (!node) return;
        const onWheel = (event: WheelEvent): void => {
            event.preventDefault();
            const rect = node.getBoundingClientRect();
            const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
            const currentZoom = zoomRef.current;
            const currentPan = panRef.current;
            const nextZoom = clamp(currentZoom * factor, MIN_ZOOM, MAX_ZOOM);
            const cursorX = event.clientX - rect.left;
            const cursorY = event.clientY - rect.top;
            const mapX = (cursorX - currentPan.x) / currentZoom;
            const mapY = (cursorY - currentPan.y) / currentZoom;
            const nextPan = {
                x: cursorX - mapX * nextZoom,
                y: cursorY - mapY * nextZoom,
            };
            zoomRef.current = nextZoom;
            panRef.current = nextPan;
            setZoom(nextZoom);
            setPan(nextPan);
        };
        node.addEventListener('wheel', onWheel, { passive: false });
        return () => node.removeEventListener('wheel', onWheel);
    }, []);
    const dragRef = useRef<{
        startX: number;
        startY: number;
        panX: number;
        panY: number;
        moved: boolean;
        origin: Element | null;
    } | null>(null);
    const suppressClickRef = useRef(false);
    const initializedRef = useRef(false);

    useEffect(() => {
        saveStored({ points, routes });
    }, [points, routes]);

    // Open centered on the Order Camp, which is the player's first place.
    useLayoutEffect(() => {
        if (initializedRef.current) return;
        const viewport = viewportRef.current;
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        const camp = placePoint('camp') ?? { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
        const startZoom = 0.45;
        setZoom(startZoom);
        setPan({
            x: rect.width / 2 - camp.x * startZoom,
            y: rect.height / 2 - camp.y * startZoom,
        });
        initializedRef.current = true;
    }, []);

    const pointById = useMemo(
        () => new Map(points.map((point) => [point.id, point])),
        [points],
    );

    const mapPointFromEvent = (event: { clientX: number; clientY: number }): { x: number; y: number } | undefined => {
        const viewport = viewportRef.current;
        if (!viewport) return undefined;
        const rect = viewport.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left - pan.x) / zoom,
            y: (event.clientY - rect.top - pan.y) / zoom,
        };
    };

    const nextPointId = (): string => {
        let index = points.length + 1;
        while (points.some((point) => point.id === `wp_${index}`)) index += 1;
        return `wp_${index}`;
    };

    const nextRouteId = (): string => {
        let index = routes.length + 1;
        while (routes.some((route) => route.id === `route_${index}`)) index += 1;
        return `route_${index}`;
    };

    const addPointAt = (x: number, y: number): void => {
        const point: Waypoint = {
            id: nextPointId(),
            x: Math.round(x),
            y: Math.round(y),
        };
        setPoints((previous) => [...previous, point]);
        setSelectedPointId(point.id);
        setMessage(`Added ${point.id} at ${point.x}, ${point.y}.`);
    };

    const addWaypointToDraft = (point: Waypoint): void => {
        if (!draft.from) {
            setMessage('Click the origin place first, then its waypoints, then the destination place.');
            return;
        }
        if (draft.via.includes(point.id)) {
            setMessage(`${point.id} is already in this route.`);
            return;
        }
        setDraft((previous) => ({ ...previous, via: [...previous.via, point.id] }));
        setMessage(`${point.id} added to route.`);
    };

    const completeRoute = (from: MapPlaceId, to: MapPlaceId, via: string[]): void => {
        if (from === to) {
            setMessage('The origin and destination places must be different.');
            return;
        }
        const sameVia = (candidate: string[], expected: string[]): boolean =>
            candidate.length === expected.length &&
            candidate.every((id, index) => id === expected[index]);
        const reverseVia = [...via].reverse();
        // Only an identical route is rejected: the same two places may have
        // several routes through different waypoints (one longer than another).
        const duplicate = routes.some((route) =>
            (route.from === from && route.to === to && sameVia(route.via, via)) ||
            (route.from === to && route.to === from && sameVia(route.via, reverseVia)));
        if (duplicate) {
            setMessage('That exact route already exists (same places and waypoints).');
            return;
        }
        const id = nextRouteId();
        const forward: MapRoute = { id, from, to, via };
        const reverse: MapRoute = { id: `${id}_rev`, from: to, to: from, via: [...via].reverse() };
        setRoutes((previous) => [...previous, forward, reverse]);
        setDraft({ via: [] });
        setSelectedPointId(null);
        setMessage(`Created ${placeName(from)} ↔ ${placeName(to)} (${via.length} waypoint${via.length === 1 ? '' : 's'}).`);
    };

    const handlePlaceClick = (placeId: MapPlaceId): void => {
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }
        if (mode !== 'route') {
            setMessage(`${placeName(placeId)} is an endpoint place; switch to Route mode to use it.`);
            return;
        }
        if (!draft.from) {
            setDraft({ from: placeId, via: [] });
            setMessage(`Origin: ${placeName(placeId)}. Now add waypoints, then click the destination place.`);
            return;
        }
        completeRoute(draft.from, placeId, draft.via);
    };

    const handleWaypointClick = (point: Waypoint): void => {
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }
        if (mode === 'delete') {
            deletePoint(point.id);
            return;
        }
        if (mode === 'route') {
            addWaypointToDraft(point);
            return;
        }
        setSelectedPointId(point.id);
        setMessage(`${point.id}: x ${point.x}, y ${point.y}.`);
    };

    const deletePoint = (id: string): void => {
        const usedBy = routes.filter((route) => route.via.includes(id));
        if (usedBy.length > 0) {
            const confirmed = window.confirm(`${id} is used by ${usedBy.length} route(s). Delete those routes too?`);
            if (!confirmed) return;
            setRoutes((previous) => previous.filter((route) => !route.via.includes(id)));
        }
        setPoints((previous) => previous.filter((point) => point.id !== id));
        setSelectedPointId(null);
        setMessage(`Deleted ${id}.`);
    };

    const handleWorldClick = (): void => {
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }
        // Adding is handled on pointerup: a click only fires when the
        // pointer did not turn into a map drag, and waiting for click made
        // a small hand tremor swallow the waypoint.
        if (mode === 'add') return;
        if (mode === 'route') {
            setMessage('Click a place marker or a waypoint rectangle to build the route.');
        } else if (mode === 'delete') {
            setMessage('Click a waypoint rectangle to delete it.');
        }
    };

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
        if (event.button !== 0) return;
        event.preventDefault();
        dragRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            panX: pan.x,
            panY: pan.y,
            moved: false,
            origin: event.target as Element | null,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
        const drag = dragRef.current;
        if (!drag) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        // A small movement is still a click, not a drag.
        if (!drag.moved && Math.hypot(dx, dy) < 8) return;
        drag.moved = true;
        setPan({ x: drag.panX + dx, y: drag.panY + dy });
    };

    const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
        const drag = dragRef.current;
        if (!drag) return;
        dragRef.current = null;
        if (drag.moved) {
            suppressClickRef.current = true;
            return;
        }
        // In add mode a static pointerup on the map background creates the
        // waypoint. Marker pointerdowns are left to their own click handlers.
        if (mode !== 'add') return;
        if (drag.origin?.closest('.map-editor-place, .map-editor-point')) return;
        const position = mapPointFromEvent(event);
        if (position) addPointAt(position.x, position.y);
    };

    const centerOn = (placeId: MapPlaceId): void => {
        const viewport = viewportRef.current;
        const target = placePoint(placeId);
        if (!viewport || !target) return;
        const rect = viewport.getBoundingClientRect();
        setPan({
            x: rect.width / 2 - target.x * zoom,
            y: rect.height / 2 - target.y * zoom,
        });
    };

    const clearRoutes = (): void => {
        if (routes.length === 0) return;
        if (!window.confirm(`Delete all ${routes.length} directed routes?`)) return;
        setRoutes([]);
        setMessage('All routes cleared.');
    };

    const resetEditor = (): void => {
        if (!window.confirm('Delete every waypoint and route in this editor?')) return;
        setPoints([]);
        setRoutes([]);
        setDraft({ via: [] });
        setSelectedPointId(null);
        setMessage('Editor reset.');
    };

    const exportData = (): void => {
        const payload = {
            map: { width: MAP_WIDTH, height: MAP_HEIGHT },
            points,
            routes,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'map-routes.json';
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
        setMessage(`Downloaded ${points.length} points and ${routes.length} directed routes.`);
    };

    const copyData = async (): Promise<void> => {
        const payload = {
            map: { width: MAP_WIDTH, height: MAP_HEIGHT },
            points,
            routes,
        };
        try {
            await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
            setMessage('JSON copied to the clipboard.');
        } catch {
            setMessage('Clipboard unavailable; use Download instead.');
        }
    };

    const draftCoords = useMemo(() => {
        if (!draft.from) return [];
        const start = placePoint(draft.from);
        const middle = draft.via
            .map((id) => pointById.get(id))
            .filter((point): point is Waypoint => Boolean(point));
        return start ? [start, ...middle] : [];
    }, [draft, pointById]);

    const selectMode = (next: Mode): void => {
        setMode(next);
        setDraft({ via: [] });
        setOpenModal(null);
        setMessage(
            next === 'add' ? 'Click the map to add a waypoint.' :
                next === 'delete' ? 'Click a waypoint rectangle to delete it.' :
                    next === 'route' ? 'Click the origin place, its waypoints and the destination place.' :
                        'Click a waypoint or place to inspect it.',
        );
    };

    const deleteRoutePair = (routeId: string): void => {
        const base = routeId.replace(/_rev$/, '');
        setRoutes((previous) => previous.filter((route) => route.id !== base && route.id !== `${base}_rev`));
        setMessage('Route removed.');
    };

    return (
        <div className="action-bar-demo map-editor-page pixel-font">
            <div className="action-bar-demo-content">
                <div className="pixel-panel">
                    <div className="pixel-title">Map Route Editor</div>
                    <div className="map-editor-topbar">
                        <button type="button" className="pixel-btn" onClick={() => setOpenModal('tools')}>
                            Tools
                        </button>
                        <button type="button" className="pixel-btn" onClick={() => setOpenModal('lists')}>
                            Waypoints &amp; Routes
                        </button>
                        <button type="button" className="pixel-btn" onClick={() => setOpenModal('data')}>
                            Data
                        </button>
                    </div>
                    <div className="map-editor-hint">{message}</div>
                    {mode === 'route' ? (
                        <div className="map-editor-draft">
                            Origin: {draft.from ? placeName(draft.from) : '—'}
                            {' · '}
                            Waypoints: {draft.via.length > 0 ? draft.via.join(' → ') : 'none'}
                            {' · '}
                            {draft.from ? 'click the destination place to finish' : 'click a place to start'}
                        </div>
                    ) : null}

                    <div
                        ref={viewportRef}
                        className={`map-editor-viewport${mode === 'add' ? ' map-editor-viewport--add' : ''}`}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    >
                        <div
                            className="map-editor-world"
                            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                            onClick={handleWorldClick}
                            onDragStart={(event) => event.preventDefault()}
                        >
                            <img
                                className="map-editor-image"
                                src={mapaSrc}
                                alt="World map"
                                width={MAP_WIDTH}
                                height={MAP_HEIGHT}
                                draggable={false}
                            />
                            <svg
                                className="map-editor-routes"
                                width={MAP_WIDTH}
                                height={MAP_HEIGHT}
                                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                            >
                                {routes.map((route) => {
                                    const line = routePoints(route, points);
                                    if (line.length < 2) return null;
                                    return (
                                        <polyline
                                            key={route.id}
                                            points={line.map((point) => `${point.x},${point.y}`).join(' ')}
                                            className={`map-editor-route${route.id.endsWith('_rev') ? ' map-editor-route--reverse' : ''}`}
                                        />
                                    );
                                })}
                                {draftCoords.length > 0 ? (
                                    <polyline
                                        points={draftCoords.map((point) => `${point.x},${point.y}`).join(' ')}
                                        className="map-editor-route map-editor-route--draft"
                                    />
                                ) : null}
                            </svg>
                            {MAP_PLACES.map((place) => {
                                const position = place.marker ?? { x: place.x, y: place.y };
                                return (
                                    <div
                                        key={place.placeId}
                                        className={`map-editor-place${draft.from === place.placeId ? ' map-editor-place--selected' : ''}`}
                                        style={{ left: position.x, top: position.y }}
                                        title={`${place.name} (${place.placeId})`}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handlePlaceClick(place.placeId);
                                        }}
                                    >
                                        <span className="map-editor-place-label">{place.name}</span>
                                    </div>
                                );
                            })}
                            {points.map((point) => (
                                <div
                                    key={point.id}
                                    className={`map-editor-point${selectedPointId === point.id ? ' map-editor-point--selected' : ''}`}
                                    style={{ left: point.x, top: point.y, width: POINT_SIZE, height: POINT_SIZE }}
                                    title={`${point.id} (${point.x}, ${point.y})`}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        handleWaypointClick(point);
                                    }}
                                >
                                    <span className="map-editor-point-label">{point.id}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <Modal title="Tools" open={openModal === 'tools'} onClose={() => setOpenModal(null)} size="lg">
                <div className="map-editor-modal">
                    <div className="pixel-caption">Pick a tool to work on the map.</div>
                    <div className="map-editor-toolbar">
                        <button type="button" className={`pixel-btn${mode === 'idle' ? ' pixel-btn--primary' : ''}`} onClick={() => selectMode('idle')}>
                            Inspect
                        </button>
                        <button type="button" className={`pixel-btn${mode === 'add' ? ' pixel-btn--primary' : ''}`} onClick={() => selectMode('add')}>
                            Add point
                        </button>
                        <button type="button" className={`pixel-btn${mode === 'delete' ? ' pixel-btn--danger' : ''}`} onClick={() => selectMode('delete')}>
                            Delete point
                        </button>
                        <button type="button" className={`pixel-btn${mode === 'route' ? ' pixel-btn--primary' : ''}`} onClick={() => selectMode('route')}>
                            Route
                        </button>
                    </div>
                    <div className="map-editor-toolbar">
                        <button type="button" className="pixel-btn" onClick={() => setZoom((value) => clamp(value / 1.25, MIN_ZOOM, MAX_ZOOM))}>
                            −
                        </button>
                        <span className="map-editor-zoom">{Math.round(zoom * 100)}%</span>
                        <button type="button" className="pixel-btn" onClick={() => setZoom((value) => clamp(value * 1.25, MIN_ZOOM, MAX_ZOOM))}>
                            +
                        </button>
                        <button type="button" className="pixel-btn" onClick={() => centerOn('camp')}>
                            Center camp
                        </button>
                    </div>
                    <div className="pixel-caption">
                        Drag the map to pan. The wheel zooms at the cursor without scrolling the page.
                    </div>
                </div>
            </Modal>

            <Modal
                title="Waypoints & Routes"
                open={openModal === 'lists'}
                onClose={() => setOpenModal(null)}
                size="lg"
            >
                <div className="map-editor-modal">
                    <div className="pixel-title">Waypoints ({points.length})</div>
                    {points.length === 0 ? (
                        <div className="pixel-caption">No waypoints yet. Use Tools → Add point.</div>
                    ) : (
                        <div className="map-editor-list">
                            {points.map((point) => (
                                <div key={point.id} className="map-editor-list-row">
                                    <span>{point.id}</span>
                                    <span className="map-editor-list-meta">{point.x}, {point.y}</span>
                                    <button type="button" className="pixel-btn pixel-btn--danger" onClick={() => deletePoint(point.id)}>
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="pixel-title" style={{ marginTop: 'var(--s2)' }}>Routes ({routes.length} directed)</div>
                    {routes.length === 0 ? (
                        <div className="pixel-caption">No routes yet. Use Tools → Route.</div>
                    ) : (
                        <div className="map-editor-list">
                            {routes.map((route) => (
                                <div key={route.id} className="map-editor-list-row">
                                    <span>{placeName(route.from)} → {placeName(route.to)}</span>
                                    <span className="map-editor-list-meta">{route.via.length} wp</span>
                                    <button type="button" className="pixel-btn pixel-btn--danger" onClick={() => deleteRoutePair(route.id)}>
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            <Modal title="Data" open={openModal === 'data'} onClose={() => setOpenModal(null)} size="lg">
                <div className="map-editor-modal">
                    <div className="pixel-caption">
                        {points.length} waypoints · {routes.length} directed routes.
                        The JSON contains one entry per direction so the reverse route is explicit.
                    </div>
                    <div className="map-editor-toolbar">
                        <button type="button" className="pixel-btn pixel-btn--primary" onClick={exportData}>
                            Download JSON
                        </button>
                        <button type="button" className="pixel-btn" onClick={() => { void copyData(); }}>
                            Copy JSON
                        </button>
                        <button type="button" className="pixel-btn" onClick={clearRoutes}>
                            Clear routes
                        </button>
                        <button type="button" className="pixel-btn pixel-btn--danger" onClick={resetEditor}>
                            Reset editor
                        </button>
                    </div>
                    <div className="pixel-caption">
                        The editor autosaves to this browser while you work. Download/Copy is the data to commit.
                    </div>
                </div>
            </Modal>
        </div>
    );
}
