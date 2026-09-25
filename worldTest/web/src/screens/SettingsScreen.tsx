import { useGame } from '../game/GameContext';
import { MenuSection, type MenuOption } from '../components/Menu';

/**
 * The settings menu: the player options that used to live on the place
 * screen, reachable from the header gear. The map stays on the header.
 */
export function SettingsScreen() {
    const api = useGame();

    const options: MenuOption[] = [
        { icon: '👥', label: 'Team', onClick: () => api.navigate({ name: 'team' }) },
        { icon: '🎒', label: 'Inventory', onClick: () => api.navigate({ name: 'inventory' }) },
        { icon: '📖', label: 'Skill Catalog', onClick: () => api.navigate({ name: 'skills' }) },
        { icon: '🎲', label: 'Loot Tables', onClick: () => api.navigate({ name: 'loot' }) },
        { icon: '🛠️', label: 'Dev', onClick: () => api.navigate({ name: 'dev' }) },
        { icon: '💾', label: 'Save game', onClick: () => api.save() },
        { icon: '📂', label: 'Load game', onClick: () => api.load() },
    ];

    return (
        <div className="screen">
            <div className="card place-hero">
                <div className="emoji">⚙️</div>
                <h1>Settings</h1>
                <p>Player options.</p>
            </div>
            <MenuSection title="Menu" icon="⚙️" options={options} />
            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
