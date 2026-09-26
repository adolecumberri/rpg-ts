import { useGame } from '../game/GameContext';
import { MenuSection, type MenuOption } from '../components/Menu';

/**
 * The missions screen: everything mission-related lives here — the
 * missions in progress (open/cancel) and the ones offered at the
 * current place's board.
 */
export function MissionsScreen() {
    const api = useGame();

    const inProgress: MenuOption[] = api.session.missions.activeMissions().map((runner) => ({
        icon: '❗',
        label: runner.title(),
        sub: 'Open',
        onClick: () => api.navigate({ name: 'mission', missionId: runner.missionId() }),
    }));

    const available: MenuOption[] = api.session.missions
        .availableMissions(api.session.currentPlaceId)
        .map((mission) => ({
            icon: '📜',
            label: mission.title,
            sub: 'View',
            onClick: () => api.navigate({ name: 'mission', missionId: mission.id }),
        }));

    const completed: MenuOption[] = api.session.missions.completedIds()
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
                <div className="emoji">📜</div>
                <h1>Missions</h1>
                <p>Your orders, the board offers and the finished business.</p>
            </div>

            <MenuSection title="In progress" icon="❗" options={inProgress} />
            <MenuSection title={`Available here · ${api.currentPlace.name}`} icon="📜" options={available} />
            <MenuSection title="Completed" icon="✅" options={completed} />

            <button className="btn" onClick={() => api.back()}>Back</button>
        </div>
    );
}
