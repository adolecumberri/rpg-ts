import { useState } from 'react';
import { PLACES, PLACES_BY_ID, buildTravelGraph, reachableTravelGraph } from '@core';
import { useGame } from '../game/GameContext';
import { WorldMap } from '../components/WorldMap/WorldMap';
import { REGION_IDS } from '../components/WorldMap/ids';
import type { RegionId } from '../components/WorldMap/ids';
import { MAP_PLACES } from '../components/WorldMap/mapPlaces';
import type { MapPlace } from '../components/WorldMap/mapPlaces';
import { OptionsBar } from '../components/UI/OptionsBar';

/**
 * The world map page: the canonical map of the game. The bottom
 * action bar is ALWAYS visible (fixed layout): by default it shows
 * the current place; tapping a map place switches the bar to that
 * place (Go travels, Back returns to the current place).
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

    // The places reachable from the current one: their markers use the
    // normal circle; unreachable ones use the third sprite frame.
    const reachableGraph = reachableTravelGraph(
        buildTravelGraph(
            PLACES,
            api.session.unlocked,
            (missionId) => api.session.missionIsActive(missionId),
        ),
        api.session.currentPlaceId,
    );
    const reachablePlaceIds = new Set(reachableGraph.nodes.map((node) => node.id));

    // Unavailable places: no click on the map, and the Go button is
    // disabled (the bar explains why via the disabled hint).
    const shownReachable = shown ? reachablePlaceIds.has(shown.placeId) : false;

    const go = () => {
        if (!shown || !shownReachable) return;
        // The engine answers for every id: unknown/unconnected places
        // come back with ok: false and a message.
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
                reachablePlaceIds={reachablePlaceIds}
                undiscovered="select"
            />
            <OptionsBar
                banner={shownName}
                options={[{
                    id: 'go',
                    label: 'Go',
                    icon: '🚶',
                    sub: 'Travel',
                    onClick: go,
                    disabled: !shownReachable,
                    disabledReason: 'You cannot reach this place.',
                }]}
                back={{ label: 'Back', onClick: back }}
                pinLast
            />
        </div>
    );
}
