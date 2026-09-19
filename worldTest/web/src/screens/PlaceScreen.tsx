import { useGame } from '../game/GameContext';
import { MenuSection, type MenuOption } from '../components/Menu';

export function PlaceScreen() {
    const api = useGame();
    const place = api.currentPlace;

    const talks: MenuOption[] = [];
    const combats: MenuOption[] = [];
    const services: MenuOption[] = [];
    const travels: MenuOption[] = [];

    for (const npc of api.npcsAtCurrent) {
        talks.push({
            icon: '👤',
            label: npc.character.name,
            sub: 'Talk / Fight',
            onClick: () => api.navigate({ name: 'npc', npcId: npc.id, placeId: place.id }),
        });
    }

    for (const action of place.actions) {
        if (action.kind === 'message') {
            talks.push({
                icon: action.icon ?? '💬',
                label: action.label,
                onClick: () => {
                    if (action.gold) api.team.gold += action.gold;
                    api.refresh();
                    api.showToast(action.message);
                },
            });
        } else if (action.kind === 'fight') {
            combats.push({
                icon: action.icon ?? '⚔️',
                label: action.label,
                onClick: () => api.navigate({ name: 'combat', npcId: action.npcId, placeId: place.id }),
            });
        } else if (action.kind === 'fight_group') {
            combats.push({
                icon: action.icon ?? '⚔️',
                label: action.label,
                onClick: () => api.navigate({ name: 'combat', group: true, groupId: action.groupId, placeId: place.id }),
            });
        } else if (action.kind === 'interval') {
            combats.push({
                icon: action.icon ?? '⏱️',
                label: action.label,
                onClick: () => api.navigate({ name: 'interval' }),
            });
        } else if (action.kind === 'shop') {
            services.push({ icon: action.icon ?? '🛒', label: action.label, onClick: () => api.navigate({ name: 'shop' }) });
        } else if (action.kind === 'rest') {
            services.push({ icon: action.icon ?? '🛏️', label: action.label, onClick: () => api.rest() });
        }
    }

    for (const conn of place.connections) {
        const locked = Boolean(conn.requiredFlag && !api.unlocked.has(conn.requiredFlag));
        travels.push({
            icon: conn.icon ?? '🧭',
            label: conn.label,
            sub: locked ? 'Locked' : undefined,
            onClick: () => api.travel(conn.to),
        });
    }

    const party: MenuOption[] = [
        { icon: '👥', label: 'Team', onClick: () => api.navigate({ name: 'team' }) },
        { icon: '🎒', label: 'Inventory', onClick: () => api.navigate({ name: 'inventory' }) },
        { icon: '🗺️', label: 'World Map', onClick: () => api.navigate({ name: 'map' }) },
        { icon: '🎲', label: 'Loot Tables', onClick: () => api.navigate({ name: 'loot' }) },
    ];

    return (
        <div className="screen">
            <div className="card place-hero">
                <div className="emoji">{place.emoji}</div>
                <h1>{place.name}</h1>
                <p>{place.description}</p>
            </div>
            <MenuSection title="Talks" icon="💬" options={talks} />
            <MenuSection title="Combats" icon="⚔️" options={combats} />
            <MenuSection title="Services" icon="🏪" options={services} />
            <MenuSection title="Travel" icon="🧭" options={travels} />
            <MenuSection title="Party" icon="🎒" options={party} />
        </div>
    );
}
