import { useState } from 'react';
import { useGame } from '../game/GameContext';
import { PlacePage } from './PlacePage';
import { TeamPage } from './TeamPage';
import { WorldMapScreen } from './WorldMapScreen';
import { ActionBarTestScreen } from './ActionBarTestScreen';
import { StressFightScreen } from './StressFightScreen';
import { FightGenScreen } from './FightGenScreen';
import { DamagesScreen } from './DamagesScreen';
import { MAP_PLACES } from '../components/WorldMap/mapPlaces';
import { REGION_BY_ID } from '../components/WorldMap/regions';
import { COUNTRY_BY_ID, countryOfRegion } from '../components/WorldMap/countries';

/**
 * The main UI router: a clean-room shell for the pixel-art design. It
 * renders inside the same scaled canvas but shares nothing with the
 * legacy app chrome (no old header/shell) — only pixelUI.css classes.
 * The header menu opens a modal that lists the pages as rows.
 */
// The main menu rows (google-stitch view 3): a Material Symbol in the
// icon frame, a Press Start 2P title, a two-digit index and a VT323
// caption. The place caption is dynamic (the current place name).
const PAGES = [
    { id: 'place', label: 'Place', symbol: 'castle', caption: '' },
    { id: 'team', label: 'Team', symbol: 'groups', caption: 'Active Squad & Equipment' },
    { id: 'worldmap', label: 'World Map', symbol: 'map', caption: 'Regions & Exploration' },
    { id: 'actions', label: 'Actions', symbol: 'ads_click', caption: 'Action Bar Showcase' },
    { id: 'stress', label: 'Stress 80v80', symbol: 'swords', caption: 'Mass Battle Stress Test' },
    { id: 'fightgen', label: 'Fight Gen', symbol: 'casino', caption: 'Random Fight Generator' },
    { id: 'damages', label: 'Damages', symbol: 'bolt', caption: 'Damage Numbers Demo' },
] as const;

type PageId = typeof PAGES[number]['id'];

export function NewUiRouter() {
    const [page, setPage] = useState<PageId>('place');
    const [menuOpen, setMenuOpen] = useState(false);
    const api = useGame();

    // The header's world context: the country/region of the current
    // place, the day, the gold and the season (real engine data).
    const mapPlace = MAP_PLACES.find((entry) => entry.placeId === api.session.currentPlaceId);
    const regionId = mapPlace?.regionId ?? null;
    const countryId = regionId ? countryOfRegion(regionId) : null;
    const countryName = countryId ? COUNTRY_BY_ID[countryId]?.name : null;
    const countryLabel = countryName ? `EL ${countryName.toUpperCase()}` : '';
    const zoneLabel = regionId ? REGION_BY_ID[regionId]?.name.toUpperCase() : '';

    return (
        <div className="newui-shell pixel-font" style={{ position: 'relative' }}>
            <div className="newui-header">
                <button
                    type="button"
                    className="newui-header-menu pixel-btn"
                    aria-label="Menu"
                    onClick={() => setMenuOpen(true)}
                >
                    <span className="newui-header-menu-bar" />
                    <span className="newui-header-menu-bar" />
                    <span className="newui-header-menu-bar" />
                </button>
                <div className="newui-header-context">
                    <div className="newui-header-region-row">
                        <span className="newui-header-region">{countryLabel}</span>
                        {zoneLabel ? <span className="newui-header-zone">{zoneLabel}</span> : null}
                    </div>
                    <div className="newui-header-stats">
                        <span className="newui-header-day">
                            <span className="newui-header-dot" />
                            DAY {api.session.calendar.dayOfMonth()}
                        </span>
                        <span className="newui-header-sep">|</span>
                        <span className="newui-header-gold">G {api.team.gold}</span>
                        <span className="newui-header-sep">|</span>
                        <span className="newui-header-season">{api.session.calendar.season().icon}</span>
                    </div>
                </div>
                <div className="newui-header-logo">
                    <span className="newui-header-logo-name">RPG-TS</span>
                    <span className="newui-header-save">SAVE: OK</span>
                </div>
            </div>

            <div className="newui-body">
                {page === 'place' ? <PlacePage onOpenTeam={() => setPage('team')} /> : null}
                {page === 'team' ? <TeamPage onBack={() => setPage('place')} /> : null}
                {page === 'worldmap' ? <WorldMapScreen /> : null}
                {page === 'actions' ? <ActionBarTestScreen /> : null}
                {page === 'stress' ? <StressFightScreen /> : null}
                {page === 'fightgen' ? <FightGenScreen /> : null}
                {page === 'damages' ? <DamagesScreen /> : null}
            </div>

            {api.toast ? <div className="newui-toast">{api.toast}</div> : null}

            {menuOpen ? (
                <div className="menu-overlay" role="dialog" aria-label="Menu">
                    <div className="menu-overlay-head">
                        <span className="menu-overlay-title">
                            <span className="material-symbol" aria-hidden="true">play_arrow</span>
                            MENÚ PRINCIPAL
                        </span>
                        <button
                            type="button"
                            className="tactical-close-btn"
                            aria-label="Close"
                            onClick={() => setMenuOpen(false)}
                        >
                            ✕
                        </button>
                    </div>
                    <div className="menu-overlay-list">
                        {PAGES.map((entry, index) => (
                            <button
                                key={entry.id}
                                type="button"
                                className="tactical-menu-row"
                                onClick={() => {
                                    setPage(entry.id);
                                    setMenuOpen(false);
                                }}
                            >
                                <span className="tactical-icon-frame material-symbol" aria-hidden="true">
                                    {entry.symbol}
                                </span>
                                <span className="tactical-menu-text">
                                    <span className="tactical-menu-title-line">
                                        <span className="tactical-menu-title">{entry.label}</span>
                                        <span className="tactical-menu-number">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                    </span>
                                    <span className="tactical-menu-caption">
                                        {entry.id === 'place' ? `Current: ${mapPlace?.name ?? '—'}` : entry.caption}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
