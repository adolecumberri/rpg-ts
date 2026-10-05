import { useState } from 'react';
import { useGame } from '../game/GameContext';
import { OptionsBar } from '../components/UI/OptionsBar';
import type { OptionSpec } from '../components/UI/OptionsBar';
import { placeImageOf } from '../assets/places';
import { ACTION_ICONS } from '../assets/actionIcons';
import { WorldMapScreen } from './WorldMapScreen';

/**
 * The place page (new UI): the place's hero plus its action bar, with
 * the Map option always first so it never hides behind the bar's
 * pagination. The map is the canonical WorldMap now.
 */
export function PlacePage({ onOpenTeam }: { onOpenTeam?: () => void }) {
    const api = useGame();
    const [view, setView] = useState<'place' | 'map'>('place');

    if (view === 'map') {
        return <WorldMapScreen onBack={() => setView('place')} />;
    }

    const place = api.currentPlace;
    const options: OptionSpec[] = [];

    // Always first: the map stays on the first page of the bar.
    options.push({ id: 'map', label: 'Map', icon: ACTION_ICONS.map, sub: 'Region', onClick: () => setView('map') });

    const corpses = api.session.corpsesAt(place.id).length;

    if (place.menu === false) {
        // Story-only place: nothing to do except the map — unless a
        // battle left corpses behind, which still need to be picked up.
        if (corpses > 0) {
            options.push({
                id: 'look',
                label: `Look around ⚰️ ${corpses}`,
                icon: '🔍',
                onClick: () => api.navigate({ name: 'lookaround' }),
            });
        }
    } else {
        for (const action of place.actions) {
            if (action.kind === 'message') {
                options.push({
                    id: action.id,
                    label: action.label,
                    icon: action.icon ?? { symbol: 'chat', color: '#f2ca50' },
                    onClick: () => {
                        if (action.gold) api.team.gold += action.gold;
                        api.refresh();
                        api.showToast(action.message);
                    },
                });
            } else if (action.kind === 'fight') {
                options.push({
                    id: action.id,
                    label: action.label,
                    icon: action.icon ?? { symbol: 'swords', color: '#f2ca50' },
                    tone: 'danger',
                    onClick: () => api.navigate({ name: 'combat', npcId: action.npcId, placeId: place.id }),
                });
            } else if (action.kind === 'fight_group') {
                options.push({
                    id: action.id,
                    label: action.label,
                    icon: action.icon ?? { symbol: 'swords', color: '#f2ca50' },
                    tone: 'danger',
                    onClick: () => api.navigate({ name: 'combat', fightId: action.fightId, placeId: place.id }),
                });
            } else if (action.kind === 'interval') {
                options.push({
                    id: action.id,
                    label: action.label,
                    icon: action.icon ?? { symbol: 'timer', color: '#f2ca50' },
                    tone: 'danger',
                    onClick: () => api.navigate({ name: 'interval' }),
                });
            } else if (action.kind === 'shop') {
                const closed = api.session.shopClosed(action.shopId ?? '');
                options.push({
                    id: action.id,
                    label: action.label,
                    icon: ACTION_ICONS.shop,
                    sub: 'Goods & Rations',
                    disabled: closed,
                    disabledReason: 'Closed',
                    onClick: () => api.navigate({ name: 'shop', shopId: action.shopId }),
                });
            } else if (action.kind === 'rest') {
                options.push({
                    id: action.id,
                    label: action.label,
                    icon: action.icon ?? { symbol: 'bed', color: '#f2ca50' },
                    onClick: () => api.rest(),
                });
            } else if (action.kind === 'train') {
                options.push({
                    id: action.id,
                    label: action.label,
                    icon: action.icon ?? { symbol: 'fitness_center', color: '#f2ca50' },
                    onClick: () => {
                        const result = api.session.train(action.levels);
                        api.refresh();
                        api.showToast(result.message);
                    },
                });
            } else if (action.kind === 'task') {
                options.push({
                    id: action.id,
                    label: action.label,
                    icon: action.icon ?? { symbol: 'agriculture', color: '#f2ca50' },
                    onClick: () => {
                        const result = api.session.doTask(action);
                        api.refresh();
                        api.showToast(result.message);
                    },
                });
            } else if (action.kind === 'mission') {
                const completed = api.session.missions.isCompleted(action.missionId);
                options.push({
                    id: action.id,
                    label: completed ? `${action.label} ✓` : action.label,
                    icon: action.icon ?? { symbol: 'description', color: '#f2ca50' },
                    onClick: () => {
                        if (completed) {
                            api.showToast('This mission is already completed.');
                            return;
                        }
                        const runner = api.session.missions.start(action.missionId);
                        api.refresh();
                        api.showToast(runner ? `${runner.title()} started.` : 'Unknown mission.');
                    },
                });
            } else if (action.kind === 'mission_board') {
                options.push({
                    id: action.id,
                    label: action.label,
                    icon: ACTION_ICONS.missions,
                    sub: 'The Hall',
                    onClick: () => api.navigate({ name: 'board' }),
                });
            } else if (action.kind === 'team') {
                options.push({
                    id: action.id,
                    label: action.label,
                    icon: action.icon ?? { symbol: 'groups', color: '#f2ca50' },
                    onClick: () => {
                        if (onOpenTeam) {
                            onOpenTeam();
                            return;
                        }
                        api.navigate({ name: 'team' });
                    },
                });
            } else if (action.kind === 'look_around') {
                options.push({
                    id: action.id,
                    label: corpses > 0 ? `${action.label} ⚰️ ${corpses}` : action.label,
                    icon: ACTION_ICONS.look,
                    sub: 'Inspect',
                    onClick: () => api.navigate({ name: 'lookaround' }),
                });
            } else if (action.kind === 'fountain') {
                const candidates = api.session.fountainCandidates().length;
                options.push({
                    id: action.id,
                    label: candidates > 0 ? `${action.label} ♻️` : action.label,
                    icon: action.icon ?? { symbol: 'water_drop', color: '#f2ca50' },
                    onClick: () => api.navigate({ name: 'fountain' }),
                });
            }
        }
    }

    const markers = api.session.markersAt(place.id);
    const activeHere = api.session.activeMissionsAt(place.id);

    return (
        <div className="pixel-font" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="place-view">
                <img className="place-image" src={placeImageOf(place.image)} alt={place.name} />
                <div className="place-caption">
                    <div className="place-card-head">
                        <div className="place-card-title">{place.name}</div>
                        {place.subtitle ? (
                            <div className="place-card-subtitle">{place.subtitle}</div>
                        ) : null}
                    </div>
                    <p className="place-card-desc">{place.description}</p>
                    {activeHere.length > 0 || markers.length > 0 ? (
                        <div style={{ marginTop: 8 }}>
                            {activeHere.map((mission) => (
                                <div key={mission.missionId} style={{ fontSize: 'var(--s3)' }}>
                                    ❗ {mission.title}
                                </div>
                            ))}
                            {markers.length > 0 ? (
                                <div style={{ fontSize: 'var(--s3)' }}>❗ Mission here</div>
                            ) : null}
                            {activeHere.length > 0 ? (
                                <button
                                    type="button"
                                    className="pixel-btn pixel-btn--primary"
                                    style={{ marginTop: 8 }}
                                    onClick={() => api.navigate({
                                        name: 'mission',
                                        missionId: activeHere[0].missionId,
                                    })}
                                >
                                    Open
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    {place.menu === false && corpses === 0 ? (
                        <div style={{ fontSize: 'var(--s3)', color: 'var(--muted)', marginTop: 8 }}>
                            There is nothing to do here.
                        </div>
                    ) : null}
                </div>
            </div>
            <OptionsBar options={options} size="lg" />
        </div>
    );
}
