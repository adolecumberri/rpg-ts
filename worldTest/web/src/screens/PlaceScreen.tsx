import { useGame } from '../game/GameContext';
import { MenuSection, type MenuOption } from '../components/Menu';

export function PlaceScreen() {
    const api = useGame();
    const place = api.currentPlace;

    const combats: MenuOption[] = [];
    const services: MenuOption[] = [];

    for (const action of place.actions) {
        if (action.kind === 'message') {
            services.push({
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
                onClick: () => api.navigate({ name: 'combat', fightId: action.fightId, placeId: place.id }),
            });
        } else if (action.kind === 'interval') {
            combats.push({
                icon: action.icon ?? '⏱️',
                label: action.label,
                onClick: () => api.navigate({ name: 'interval' }),
            });
        } else if (action.kind === 'shop') {
            const closed = api.session.shopClosed(action.shopId ?? '');
            services.push({
                icon: action.icon ?? '🛒',
                label: action.label,
                sub: closed ? 'Closed' : undefined,
                disabled: closed,
                onClick: () => api.navigate({ name: 'shop', shopId: action.shopId }),
            });
        } else if (action.kind === 'rest') {
            services.push({ icon: action.icon ?? '🛏️', label: action.label, onClick: () => api.rest() });
        } else if (action.kind === 'train') {
            services.push({
                icon: action.icon ?? '💪',
                label: action.label,
                onClick: () => {
                    const result = api.session.train(action.levels);
                    api.refresh();
                    api.showToast(result.message);
                },
            });
        } else if (action.kind === 'task') {
            services.push({
                icon: action.icon ?? '🧺',
                label: action.label,
                onClick: () => {
                    const result = api.session.doTask(action);
                    api.refresh();
                    api.showToast(result.message);
                },
            });
        } else if (action.kind === 'mission') {
            combats.push({
                icon: action.icon ?? '📜',
                label: action.label,
                sub: api.session.missions.isCompleted(action.missionId) ? 'Completed' : undefined,
                onClick: () => {
                    if (api.session.missions.isCompleted(action.missionId)) {
                        api.showToast('This mission is already completed.');
                        return;
                    }
                    const runner = api.session.missions.start(action.missionId);
                    api.refresh();
                    api.showToast(runner ? `${runner.title()} started.` : 'Unknown mission.');
                },
            });
        } else if (action.kind === 'mission_board') {
            services.push({
                icon: action.icon ?? '📋',
                label: action.label,
                onClick: () => api.navigate({ name: 'board' }),
            });
        }
    }

    // Travel happens only through the World Map (place connections are
    // the map's edges); the player options live in the top navbar.

    const markers = api.session.markersAt(place.id);
    const activeHere = api.session.activeMissionsAt(place.id);

    if (place.menu === false) {
        // Story-only place (the hay field): nothing to do here.
        return (
            <div className="screen">
                <div className="card place-hero">
                    <div className="emoji">{place.emoji}</div>
                    <h1>{place.name}</h1>
                    <p>{place.description}</p>
                </div>
                <div className="empty">There is nothing to do here.</div>
                <button className="btn btn--primary" onClick={() => api.navigate({ name: 'map' })}>
                    🗺️ World Map
                </button>
            </div>
        );
    }

    return (
        <div className="screen">
            <div className="card place-hero">
                <div className="emoji">{place.emoji}</div>
                <h1>{place.name}</h1>
                <p>{place.description}</p>
            </div>
            {activeHere.length > 0 ? (
                <div className="card" style={{ textAlign: 'center', borderColor: 'rgba(245, 185, 66, 0.6)' }}>
                    {activeHere.map((mission) => (
                        <div key={mission.missionId} style={{ margin: '2px 0' }}>❗ {mission.title}</div>
                    ))}
                    <button
                        className="btn btn--primary"
                        style={{ marginTop: 8 }}
                        onClick={() => api.navigate({ name: 'mission', missionId: activeHere[0].missionId })}
                    >
                        Open
                    </button>
                </div>
            ) : null}
            {markers.length > 0 ? (
                <div className="card" style={{ textAlign: 'center', borderColor: 'rgba(245, 185, 66, 0.6)' }}>
                    ❗ Mission here
                </div>
            ) : null}
            <MenuSection title="Combats" icon="⚔️" options={combats} />
            <MenuSection title="Services" icon="🏪" options={services} />
        </div>
    );
}
