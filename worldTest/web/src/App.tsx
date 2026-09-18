import { GameProvider, useGame } from './game/GameContext';
import { PlaceScreen } from './screens/PlaceScreen';
import { TeamScreen } from './screens/TeamScreen';
import { CharacterScreen } from './screens/CharacterScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { ShopScreen } from './screens/ShopScreen';
import { CombatScreen } from './screens/CombatScreen';
import { NpcScreen } from './screens/NpcScreen';
import { SkillTreeScreen } from './screens/SkillTreeScreen';
import { MapScreen } from './screens/MapScreen';
import { LootScreen } from './screens/LootScreen';

function Header() {
    const api = useGame();
    const route = api.current;

    let title = 'RPG-TS';
    if (route.name === 'place') title = api.currentPlace.name;
    else if (route.name === 'team') title = 'Team';
    else if (route.name === 'inventory') title = 'Inventory';
    else if (route.name === 'shop') title = 'Shop';
    else if (route.name === 'combat') title = 'Combat';
    else if (route.name === 'npc') title = api.findNpc(route.npcId)?.character.name ?? 'Character';
    else if (route.name === 'character') title = api.team.getCharacter(route.characterId)?.name ?? 'Character';
    else if (route.name === 'skilltree') title = 'Skill Tree';
    else if (route.name === 'map') title = 'World Map';
    else if (route.name === 'loot') title = 'Loot Tables';

    return (
        <div className="header">
            {api.routes.length > 1 ? (
                <button className="back" onClick={() => api.back()}>‹</button>
            ) : (
                <div style={{ width: 38 }} />
            )}
            <div className="header-title">{title}</div>
            <button
                className="back"
                style={{ marginRight: 8, width: 'auto', padding: '0 10px' }}
                onClick={() => api.save()}
                aria-label="Save game"
            >
                💾
            </button>
            <div className="header-meta">🪙 {api.team.gold}g</div>
        </div>
    );
}

function Router() {
    const api = useGame();

    switch (api.current.name) {
        case 'place':
            return <PlaceScreen />;
        case 'team':
            return <TeamScreen />;
        case 'character':
            return <CharacterScreen characterId={api.current.characterId} />;
        case 'inventory':
            return <InventoryScreen />;
        case 'shop':
            return <ShopScreen />;
        case 'combat':
            return <CombatScreen npcId={api.current.npcId} placeId={api.current.placeId} group={api.current.group} groupId={api.current.groupId} />;
        case 'npc':
            return <NpcScreen npcId={api.current.npcId} placeId={api.current.placeId} />;
        case 'skilltree':
            return <SkillTreeScreen characterId={api.current.characterId} />;
        case 'map':
            return <MapScreen />;
        case 'loot':
            return <LootScreen />;
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
                <Toast />
            </div>
        </GameProvider>
    );
}
