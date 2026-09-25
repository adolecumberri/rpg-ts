import { useGame } from '../game/GameContext';
import { MenuSection, type MenuOption } from '../components/Menu';

/**
 * The hall board. Missions are picked here (one or more at a time) and
 * then played on the map: places with an active mission show an
 * exclamation mark.
 */
export function MissionBoardScreen() {
    const api = useGame();
    // Availability is a live query: the board asks the mission manager
    // with the current place, so every move re-evaluates the list.
    // Failed missions return to the available board automatically.
    const available = api.session.missions.availableMissions(api.session.currentPlaceId);
    const active = api.session.missions.activeMissions();
    const completed = api.session.missions.completedIds();

    const options: MenuOption[] = available.map((mission) => ({
        icon: '📜',
        label: mission.title,
        sub: 'View',
        onClick: () => api.navigate({ name: 'mission', missionId: mission.id }),
    }));

    const inProgress: MenuOption[] = active.map((runner) => ({
        icon: '❗',
        label: runner.title(),
        sub: 'Open',
        onClick: () => api.navigate({ name: 'mission', missionId: runner.missionId() }),
    }));

    const done: MenuOption[] = completed
        .map((id) => api.session.missions.mission(id))
        .filter((mission): mission is NonNullable<typeof mission> => Boolean(mission))
        .map((mission) => ({
            icon: '✅',
            label: mission.title,
            sub: 'Open',
            onClick: () => api.navigate({ name: 'mission', missionId: mission.id }),
        }));

    return (
        <div className="screen">
            <div className="card place-hero">
                <div className="emoji">📋</div>
                <h1>The Hall</h1>
                <p>Pick the missions you want, then check the map for ❗.</p>
            </div>
            {options.length === 0 && inProgress.length === 0 ? (
                <div className="empty">No missions available right now.</div>
            ) : null}
            <MenuSection title="Available" icon="📜" options={options} />
            <MenuSection title="In progress" icon="❗" options={inProgress} />
            <MenuSection title="Completed" icon="✅" options={done} />
            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
