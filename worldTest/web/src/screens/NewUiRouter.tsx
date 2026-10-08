import { useState } from 'react';
import { useGame } from '../game/GameContext';
import { PlacePage } from './PlacePage';
import { TeamPage } from './TeamPage';
import { WorldMapScreen } from './WorldMapScreen';
import { ActionBarTestScreen } from './ActionBarTestScreen';
import { StressFightScreen } from './StressFightScreen';
import { FightGenScreen } from './FightGenScreen';
import { DamagesScreen } from './DamagesScreen';
import { DialogsScreen } from './DialogsScreen';
import { ItemsScreen } from './ItemsScreen';
import { InventoryPage } from './InventoryPage';
import { FlagsScreen } from './FlagsScreen';
import { MissionsPage } from './MissionsPage';
import type { MissionTabId } from './MissionsPage';
import { CombatScreen } from './CombatScreen';
import { MessageBox } from '../components/UI/MessageBox';
import type { PendingBattle } from '../components/UI/MessageBox';
import { MAP_PLACES } from '../components/WorldMap/mapPlaces';
import { REGION_BY_ID } from '../components/WorldMap/regions';
import { REGION_IDS } from '../components/WorldMap/ids';
import type { RegionId } from '../components/WorldMap/ids';
import { COUNTRY_BY_ID, countryOfRegion } from '../components/WorldMap/countries';

/**
 * The main UI router: a clean-room shell for the pixel-art design. It
 * renders inside the same scaled canvas but shares nothing with the
 * legacy app chrome (no old header/shell) — only pixelUI.css classes.
 * The header menu opens a tactical overlay listing the game pages; the
 * dev/test screens live in their own submenu (google-stitch view 3).
 */
type MenuEntry = {
    id: string;
    label: string;
    symbol: string;
    caption: string;
};

// The main menu rows: a Material Symbol in the icon frame, a Press
// Start 2P title, a two-digit index and a VT323 caption. The place
// caption is dynamic (the current place name).
const MAIN_PAGES = [
    { id: 'place', label: 'Place', symbol: 'castle', caption: '' },
    { id: 'team', label: 'Team', symbol: 'groups', caption: 'Active Squad & Equipment' },
    { id: 'missions', label: 'Missions', symbol: 'assignment', caption: 'The mission board' },
    { id: 'worldmap', label: 'World Map', symbol: 'map', caption: 'Regions & Exploration' },
] as const;

// The dev/test screens, grouped under the Dev Tools submenu.
const DEV_PAGES = [
    { id: 'actions', label: 'Actions', symbol: 'ads_click', caption: 'Action Bar Showcase' },
    { id: 'stress', label: 'Stress 80v80', symbol: 'swords', caption: 'Mass Battle Stress Test' },
    { id: 'fightgen', label: 'Fight Gen', symbol: 'casino', caption: 'Random Fight Generator' },
    { id: 'damages', label: 'Damages', symbol: 'bolt', caption: 'Damage Numbers Demo' },
    { id: 'dialogs', label: 'Dialogs', symbol: 'forum', caption: 'Dialog editor & player' },
    { id: 'items', label: 'Items', symbol: 'inventory_2', caption: 'Every item in the game' },
    { id: 'flags', label: 'Flags', symbol: 'flag', caption: 'Toggle every story flag' },
] as const;

// The submenu opener: row 04 of the main menu.
const DEV_TOOLS_ENTRY: MenuEntry = {
    id: 'dev',
    label: 'Dev Tools',
    symbol: 'build',
    caption: 'Actions · Stress · Fight Gen · Damages',
};

const PAGES = [...MAIN_PAGES, ...DEV_PAGES] as const;

type PageId = typeof PAGES[number]['id'] | 'inventory';

export function NewUiRouter() {
    const [page, setPage] = useState<PageId>('place');
    const [menuOpen, setMenuOpen] = useState(false);
    // The submenu level inside the overlay: main pages or dev tools.
    const [menuView, setMenuView] = useState<'main' | 'dev'>('main');
    // The battle a story dialogue queued: while set, it replaces the
    // pages (the real combat screen will take over this slot).
    const [combat, setCombat] = useState<PendingBattle | null>(null);
    // The regions the map shows as discovered (shared with the map
    // page; the dev menu can reveal them all).
    const [discovered, setDiscovered] = useState<RegionId[]>([REGION_IDS.fergel_este]);
    // The tab the mission page opens on (the Party option jumps to the
    // accepted missions) and whether it is the party view (no header
    // tabs, straight to Aceptadas) or the board view (Nuevas/Otras).
    const [missionsTab, setMissionsTab] = useState<MissionTabId>('new');
    const [missionsOwned, setMissionsOwned] = useState(false);
    // The active options panel of the place screen (the party submenu
    // or the place actions) — kept here so Back from Inventory/Squad/
    // Misiones can re-open the party submenu instead of the place menu.
    const [placePanel, setPlacePanel] = useState<'place' | 'party'>('place');
    // Whether the page we navigated away to came from the party
    // submenu: its Back returns to the submenu, not to the place menu.
    const [returnToParty, setReturnToParty] = useState(false);
    // The page the main menu opened the map from: the map's Back
    // returns there.
    const [pageBeforeMap, setPageBeforeMap] = useState<PageId>('place');
    const api = useGame();

    const closeMenu = () => {
        setMenuOpen(false);
        setMenuView('main');
    };

    // Going back to the place page with the given options panel open.
    const backToPlace = (panel: 'place' | 'party') => {
        setPlacePanel(panel);
        setReturnToParty(false);
        setPage('place');
    };

    // The hamburger toggles the overlay: it opens it (always from the
    // main level) and closes it again.
    const toggleMenu = () => {
        if (menuOpen) {
            closeMenu();
        } else {
            setMenuView('main');
            setMenuOpen(true);
        }
    };

    // One tactical menu row: icon frame, Press Start 2P title, the
    // two-digit index and the VT323 caption. Locked rows (Save/Load
    // away from a place) render disabled.
    const renderRow = (entry: MenuEntry, index: number, onOpen: () => void, disabled = false) => (
        <button
            key={entry.id}
            type="button"
            className="tactical-menu-row"
            disabled={disabled}
            onClick={onOpen}
        >
            <span className="tactical-icon-frame" aria-hidden="true">
                <span className="material-symbol">{entry.symbol}</span>
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
    );

    const openPage = (id: PageId) => {
        // The main menu Missions entry always opens the board view.
        if (id === 'missions') {
            setMissionsTab('new');
            setMissionsOwned(false);
        }
        setReturnToParty(false);
        if (id === 'place') setPlacePanel('place');
        // The map's Back returns to the page it was opened from.
        if (id === 'worldmap') setPageBeforeMap(page);
        setPage(id);
        closeMenu();
    };

    // Saving and loading only happen out in the world (the place
    // screen): everywhere else (fights, dev screens, team) they lock.
    const atPlace = page === 'place';
    const lockedCaption = 'Only available at a place';
    const saveEntry: MenuEntry = {
        id: 'save',
        label: 'Save',
        symbol: 'save',
        caption: atPlace ? 'Write the current world' : lockedCaption,
    };
    const loadEntry: MenuEntry = {
        id: 'load',
        label: 'Load',
        symbol: 'download',
        caption: atPlace ? 'Restore the last save' : lockedCaption,
    };

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
                    aria-expanded={menuOpen}
                    onClick={toggleMenu}
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
                {combat ? (
                    <CombatScreen battle={combat} onEnd={() => setCombat(null)} />
                ) : (
                    <>
                        {page === 'place' ? (
                            <PlacePage
                                onOpenTeam={(fromParty) => {
                                    setReturnToParty(Boolean(fromParty));
                                    setPage('team');
                                }}
                                onOpenMissions={(tab) => {
                                    setMissionsTab(tab ?? 'new');
                                    setMissionsOwned(tab === 'accepted');
                                    setPage('missions');
                                }}
                                onOpenInventory={() => {
                                    setReturnToParty(true);
                                    setPage('inventory');
                                }}
                                panel={placePanel}
                                onPanelChange={setPlacePanel}
                                discovered={discovered}
                                setDiscovered={setDiscovered}
                            />
                        ) : null}
                        {page === 'team' ? (
                            <TeamPage onBack={() => backToPlace(returnToParty ? 'party' : 'place')} />
                        ) : null}
                        {page === 'missions' ? (
                            <MissionsPage
                                initialTab={missionsTab}
                                ownedOnly={missionsOwned}
                                onBack={() => backToPlace(missionsOwned ? 'party' : 'place')}
                            />
                        ) : null}
                        {page === 'inventory' ? (
                            <InventoryPage onBack={() => backToPlace('party')} />
                        ) : null}
                        {page === 'worldmap' ? (
                            <WorldMapScreen
                                discovered={discovered}
                                setDiscovered={setDiscovered}
                                onBack={() => setPage(pageBeforeMap)}
                            />
                        ) : null}
                        {page === 'actions' ? <ActionBarTestScreen /> : null}
                        {page === 'stress' ? <StressFightScreen /> : null}
                        {page === 'fightgen' ? <FightGenScreen /> : null}
                        {page === 'damages' ? <DamagesScreen /> : null}
                        {page === 'dialogs' ? <DialogsScreen /> : null}
                        {page === 'items' ? <ItemsScreen /> : null}
                        {page === 'flags' ? (
                            <FlagsScreen onBack={() => setPage('place')} />
                        ) : null}
                    </>
                )}
            </div>

            {api.toast ? <div className="newui-toast">{api.toast}</div> : null}

            {/* The global story dialogue: reads the engine queue, over
                everything; the consumed pending battle lands here. */}
            <MessageBox onBattle={(battle) => setCombat(battle)} />

            {menuOpen ? (
                <div className="menu-overlay" role="dialog" aria-label="Menu">
                    <div className="menu-overlay-head">
                        {menuView === 'dev' ? (
                            <span className="menu-overlay-title">
                                <button
                                    type="button"
                                    className="tactical-back-btn"
                                    aria-label="Back to main menu"
                                    onClick={() => setMenuView('main')}
                                >
                                    <span className="material-symbol" aria-hidden="true">chevron_left</span>
                                </button>
                                DEV TOOLS
                            </span>
                        ) : (
                            <span className="menu-overlay-title">
                                <span className="material-symbol" aria-hidden="true">play_arrow</span>
                                MENÚ PRINCIPAL
                            </span>
                        )}
                        <button
                            type="button"
                            className="tactical-close-btn"
                            aria-label="Close"
                            onClick={closeMenu}
                        >
                            ✕
                        </button>
                    </div>
                    <div className="menu-overlay-list">
                        {menuView === 'main' ? (
                            <>
                                {MAIN_PAGES.map((entry, index) => renderRow(entry, index, () => openPage(entry.id)))}
                                {renderRow(DEV_TOOLS_ENTRY, MAIN_PAGES.length, () => setMenuView('dev'))}
                                {renderRow(saveEntry, MAIN_PAGES.length + 1, () => {
                                    api.save();
                                    closeMenu();
                                }, !atPlace)}
                                {renderRow(loadEntry, MAIN_PAGES.length + 2, () => {
                                    api.load();
                                    setPage('place');
                                    closeMenu();
                                }, !atPlace)}
                            </>
                        ) : (
                            <>
                                {DEV_PAGES.map((entry, index) => renderRow(entry, index, () => openPage(entry.id)))}
                                {renderRow(
                                    {
                                        id: 'reset',
                                        label: 'Reset Game',
                                        symbol: 'restart_alt',
                                        caption: 'Wipe the save and start a fresh world',
                                    },
                                    DEV_PAGES.length,
                                    () => {
                                        // A full reset: fresh session (save wiped),
                                        // router state back to its defaults.
                                        api.reset();
                                        setCombat(null);
                                        setMissionsTab('new');
                                        setMissionsOwned(false);
                                        setPlacePanel('place');
                                        setDiscovered([REGION_IDS.fergel_este]);
                                        setPage('place');
                                        closeMenu();
                                    },
                                )}
                            </>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
