import { useState } from 'react';
import { WorldMap } from '../components/WorldMap/WorldMap';
import { REGIONS } from '../components/WorldMap/regions';
import { COUNTRIES } from '../components/WorldMap/countries';

/**
 * Example usage of WorldMap (the App.jsx sample): the screen owns the
 * discovery and selection state; the component is fully controlled.
 * The buttons prove that external state changes (discover, select)
 * update the map automatically.
 */
export function WorldMapScreen() {
    const [discovered, setDiscovered] = useState<string[]>(['fergel_oeste']);
    const [selected, setSelected] = useState<string | null>(null);
    const [discoveredCountries, setDiscoveredCountries] = useState<string[]>(['fergel']);
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

    return (
        <div className="newui-page pixel-font" style={{ height: '100%' }}>
            <WorldMap
                discoveredRegions={discovered}
                selectedRegion={selected}
                onRegionSelect={setSelected}
                discoveredCountries={discoveredCountries}
                selectedCountry={selectedCountry}
                onCountrySelect={setSelectedCountry}
                onRegionEnter={(regionId) => console.log('enter', regionId)}
                onRegionLeave={(regionId) => console.log('leave', regionId)}
                undiscovered="select"
            />
            <div className="pixel-panel" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                    type="button"
                    className="pixel-btn"
                    style={{ height: 'var(--s8)' }}
                    onClick={() => setDiscovered(['fergel_oeste', 'fergel_suroeste'])}
                >
                    Discover west
                </button>
                <button
                    type="button"
                    className="pixel-btn"
                    style={{ height: 'var(--s8)' }}
                    onClick={() => setSelected('fergel_oeste')}
                >
                    Select west
                </button>
                <button
                    type="button"
                    className="pixel-btn"
                    style={{ height: 'var(--s8)' }}
                    onClick={() => setDiscovered(REGIONS.map((region) => region.id))}
                >
                    Discover all
                </button>
                <button
                    type="button"
                    className="pixel-btn"
                    style={{ height: 'var(--s8)' }}
                    onClick={() => setDiscoveredCountries(COUNTRIES.map((country) => country.id))}
                >
                    Discover both countries
                </button>
            </div>
        </div>
    );
}
