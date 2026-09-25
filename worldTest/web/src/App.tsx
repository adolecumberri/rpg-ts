import { GameProvider, useGame } from './game/GameContext';
import { MessageBox } from './components/MessageBox';
import { PlaceScreen } from './screens/PlaceScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TeamScreen } from './screens/TeamScreen';
import { CharacterScreen } from './screens/CharacterScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { ShopScreen } from './screens/ShopScreen';
import { CombatScreen } from './screens/CombatScreen';
import { NpcScreen } from './screens/NpcScreen';
import { SkillTreeScreen } from './screens/SkillTreeScreen';
import { SkillCatalogScreen } from './screens/SkillCatalogScreen';
import { MissionBoardScreen } from './screens/MissionBoardScreen';
import { MissionScreen } from './screens/MissionScreen';
import { MapScreen } from './screens/MapScreen';
import { LootScreen } from './screens/LootScreen';
import { DevScreen } from './screens/DevScreen';
import { IntervalCombatScreen } from './screens/IntervalCombatScreen';
import { HybridCombatScreen } from './screens/HybridCombatScreen';

function Header() {
    const api = useGame();
    const route = api.current;

    let title = 'RPG-TS';
    if (route.name === 'place') title = api.currentPlace.name;
    else if (route.name === 'team') title = 'Team';
    else if (route.name === 'inventory') title = 'Inventory';
    else if (route.name === 'shop') title = 'Shop';
    else if (route.name === 'settings') title = 'Settings';
    else if (route.name === 'combat') title = 'Combat';
    else if (route.name === 'hybrid') title = 'Battle';
    else if (route.name === 'npc') title = api.findNpc(route.npcId)?.character.name ?? 'Character';
    else if (route.name === 'character') title = api.team.getCharacter(route.characterId)?.name ?? 'Character';
    else if (route.name === 'skilltree') title = 'Skill Tree';
    else if (route.name === 'skills') title = 'Skill Catalog';
    else if (route.name === 'board') title = 'The Hall';
    else if (route.name === 'mission') title = 'Mission';
    else if (route.name === 'map') title = 'World Map';
    else if (route.name === 'loot') title = 'Loot Tables';
    else if (route.name === 'dev') title = 'Dev';
    else if (route.name === 'interval') title = 'Interval Battle';

    return (
        <div className="header">
            <div className="header-row">
                <button
                    className="back"
                    aria-label="Settings"
                    onClick={() => api.navigate({ name: 'settings' })}
                >
                    ⚙️
                </button>
                <button
                    className="back"
                    aria-label="World Map"
                    onClick={() => api.navigate({ name: 'map' })}
                >
                    🗺️
                </button>
                <div className="header-title">{title}</div>
                <button
                    className="back"
                    style={{ marginRight: 8, width: 'auto', padding: '0 10px' }}
                    onClick={() => api.load()}
                    aria-label="Load game"
                >
                    📂
                </button>
                <button
                    className="back"
                    style={{ marginRight: 8, width: 'auto', padding: '0 10px' }}
                    onClick={() => api.save()}
                    aria-label="Save game"
                >
                    💾
                </button>
                <div className="header-meta">
                    {api.session.calendar.season().icon} {api.session.calendar.dayOfMonth()}{' '}
                    {api.session.calendar.monthName()} · 🪙 {api.team.gold}g
                </div>
            </div>
        </div>
    );
}

function Router() {
    const api = useGame();

    switch (api.current.name) {
        case 'place':
            return <PlaceScreen />;
        case 'settings':
            return <SettingsScreen />;
        case 'team':
            return <TeamScreen />;
        case 'character':
            return <CharacterScreen characterId={api.current.characterId} />;
        case 'inventory':
            return <InventoryScreen />;
        case 'shop':
            return <ShopScreen shopId={api.current.shopId} />;
        case 'combat':
            return (
                <CombatScreen
                    key={api.current.npcId ?? api.current.fightId ?? 'combat'}
                    npcId={api.current.npcId}
                    placeId={api.current.placeId}
                    fightId={api.current.fightId}
                    missionId={api.current.missionId}
                />
            );
        case 'hybrid':
            // The key forces a fresh mount per battle: chained story
            // battles navigate hybrid -> hybrid, and without it React
            // would reuse the previous battle's stale screen.
            return (
                <HybridCombatScreen
                    key={api.current.fightId ?? 'hybrid'}
                    placeId={api.current.placeId}
                    fightId={api.current.fightId}
                    missionId={api.current.missionId}
                />
            );
        case 'npc':
            return <NpcScreen npcId={api.current.npcId} placeId={api.current.placeId} />;
        case 'skilltree':
            return <SkillTreeScreen characterId={api.current.characterId} />;
        case 'skills':
            return <SkillCatalogScreen />;
        case 'board':
            return <MissionBoardScreen />;
        case 'mission':
            return <MissionScreen missionId={api.current.missionId} />;
        case 'map':
            return <MapScreen />;
        case 'loot':
            return <LootScreen />;
        case 'dev':
            return <DevScreen />;
        case 'interval':
            return <IntervalCombatScreen />;
        default:
            return <PlaceScreen />;
    }
}

function Toast() {
    const api = useGame();
    if (!api.toast) return null;
    return <div className="toast">{api.toast}</div>;
}

export default function App() {
    return (
        <GameProvider>
            <div className="app-shell">
                <Header />
                <Router />
                <MessageBox />
                <Toast />
            </div>
        </GameProvider>
    );
}
