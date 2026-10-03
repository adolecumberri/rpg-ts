import { useState } from 'react';
import { WorldMap } from '../components/WorldMap/WorldMap';
import { REGIONS } from '../components/WorldMap/regions';

/**
 * Example usage of WorldMap (the App.jsx sample): the screen owns the
 * discovery and selection state; the component is fully controlled.
 */
export function WorldMapScreen() {
    const [discovered, setDiscovered] = useState<string[]>(['fergel_este']);
    const [selected, setSelected] = useState<string | null>(null);

    return (
        <div className="newui-page pixel-font" style={{ height: '100%' }}>
            <WorldMap
                discoveredRegions={discovered}
                selectedRegion={selected}
                onRegionSelect={setSelected}
                onPointClick={(pointId) => console.log('point click', pointId)}
                onRegionEnter={(regionId) => console.log('enter', regionId)}
                onRegionLeave={(regionId) => console.log('leave', regionId)}
                undiscovered="select"
            />
            <div className="pixel-panel" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                    type="button"
                    className="pixel-btn"
                    style={{ height: 'var(--s8)' }}
                    onClick={() => setDiscovered(REGIONS.map((region) => region.id))}
                >
                    Discover all
                </button>
            </div>
        </div>
    );
}
