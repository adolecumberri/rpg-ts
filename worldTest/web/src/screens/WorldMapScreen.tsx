import { useState } from 'react';
import { PLACES_BY_ID } from '@core';
import { useGame } from '../game/GameContext';
import { WorldMap } from '../components/WorldMap/WorldMap';
import { REGION_IDS } from '../components/WorldMap/ids';
import type { RegionId } from '../components/WorldMap/ids';
import { MAP_PLACES } from '../components/WorldMap/mapPlaces';
import type { MapPlace } from '../components/WorldMap/mapPlaces';
import { OptionsBar } from '../components/UI/OptionsBar';

/**
 * The world map page: the canonical map of the game. The engine's
 * travelTargets() decides every marker: hidden places are not drawn,
 * blocked ones use the unreachable circle and explain why in the bar,
 * open ones travel straight away. Same-region places are direct
 * destinations; crossing regions needs the border connection.
 */
export function WorldMapScreen({ onBack }: { onBack?: () => void }) {
    const api = useGame();
    const [discovered, setDiscovered] = useState<RegionId[]>([REGION_IDS.fergel_este]);
    const [selected, setSelected] = useState<RegionId | null>(null);
    // The place shown in the action bar (null = the current place).
    const [place, setPlace] = useState<MapPlace | null>(null);

    const currentPlace = MAP_PLACES.find((entry) => entry.placeId === api.session.currentPlaceId) ?? null;
    const shown = place ?? currentPlace;
    const shownName = shown ? (PLACES_BY_ID[shown.placeId]?.name ?? shown.name) : api.currentPlace.name;

    // The engine answers for every place from the current position:
    // hidden, allowed or blocked (with the reason the bar explains).
    const targets = api.session.travelTargets();
    const hiddenPlaceIds = new Set(
        targets.filter((target) => target.hidden).map((target) => target.placeId),
    );
    const allowedPlaceIds = new Set(
        targets.filter((target) => target.allowed).map((target) => target.placeId),
    );
    const shownTarget = shown ? targets.find((target) => target.placeId === shown.placeId) : undefined;
    const shownReachable = shownTarget?.allowed ?? false;
    const shownReason = shownTarget?.reason;

    const go = () => {
        if (!shown || !shownReachable) return;
        // The engine answers for every id: unknown/locked places come
        // back with ok: false and a message.
        const result = api.session.travel(shown.placeId);
        api.refresh();
        api.showToast(result.message ?? 'You travel there.');
        if (place) setPlace(null);
    };

    const back = () => {
        if (place) {
            setPlace(null);
            return;
        }
        onBack?.();
    };

    return (
        <div className="newui-page pixel-font" style={{ height: '100%' }}>
            <WorldMap
                discoveredRegions={discovered}
                selectedRegion={selected}
                onRegionSelect={setSelected}
                onMapPlaceClick={(placeId) => {
                    setPlace(MAP_PLACES.find((entry) => entry.placeId === placeId) ?? null);
                }}
                currentLocationId={api.session.currentPlaceId}
                selectedPlaceId={place ? place.placeId : null}
                reachablePlaceIds={allowedPlaceIds}
                hiddenPlaceIds={hiddenPlaceIds}
                undiscovered="select"
            />
            <OptionsBar
                banner={shownName}
                options={[{
                    id: 'go',
                    label: 'Go',
                    icon: { symbol: 'directions_walk', color: '#f2ca50' },
                    sub: 'Travel',
                    onClick: go,
                    disabled: !shownReachable,
                    disabledReason: shownReason ?? 'You cannot reach this place.',
                }]}
                back={{ label: 'Back', onClick: back }}
                pinLast
            />
        </div>
    );
}
