import { useGame } from '../game/GameContext';
import { Menu, type MenuOption } from '../components/Menu';

export function PlaceScreen() {
    const api = useGame();
    const place = api.currentPlace;

    const options: MenuOption[] = [];

    for (const npc of api.npcsAtCurrent) {
        options.push({
            icon: '👤',
            label: npc.character.name,
            sub: 'Talk / Fight',
            onClick: () => api.navigate({ name: 'npc', npcId: npc.id, placeId: place.id }),
        });
    }

    for (const action of place.actions) {
        if (action.kind === 'shop') {
            options.push({ icon: action.icon ?? '🛒', label: action.label, onClick: () => api.navigate({ name: 'shop' }) });
        } else if (action.kind === 'rest') {
            options.push({ icon: action.icon ?? '🛏️', label: action.label, onClick: () => api.rest() });
        } else if (action.kind === 'message') {
            options.push({
                icon: action.icon ?? '💬',
                label: action.label,
                onClick: () => {
                    if (action.gold) api.team.gold += action.gold;
                    api.refresh();
                    api.showToast(action.message);
                },
            });
        } else if (action.kind === 'fight') {
            options.push({
                icon: action.icon ?? '⚔️',
                label: action.label,
                onClick: () => api.navigate({ name: 'combat', npcId: action.npcId, placeId: place.id }),
            });
        } else if (action.kind === 'fight_group') {
            options.push({
                icon: action.icon ?? '⚔️',
                label: action.label,
                onClick: () => api.navigate({ name: 'combat', group: true, placeId: place.id }),
            });
        }
    }

    for (const conn of place.connections) {
        const locked = Boolean(conn.requiredFlag && !api.unlocked.has(conn.requiredFlag));
        options.push({
            icon: conn.icon ?? '🧭',
            label: conn.label,
            sub: locked ? 'Locked' : undefined,
            onClick: () => api.travel(conn.to),
        });
    }

    options.push(
        { icon: '👥', label: 'Team', onClick: () => api.navigate({ name: 'team' }) },
        { icon: '🎒', label: 'Inventory', onClick: () => api.navigate({ name: 'inventory' }) },
    );

    return (
        <div className="screen">
            <div className="card place-hero">
                <div className="emoji">{place.emoji}</div>
                <h1>{place.name}</h1>
                <p>{place.description}</p>
            </div>
            <Menu options={options} />
        </div>
    );
}
