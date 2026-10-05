import { FIGHTS } from '@core';
import { OptionsBar } from '../components/UI/OptionsBar';
import type { PendingBattle } from '../components/UI/MessageBox';
import { MAP_PLACES } from '../components/WorldMap/mapPlaces';

/**
 * The combat screen placeholder: the router lands here when the story
 * dialogue consumes a pending battle. It shows the queued battle's
 * data (fight, place, mission) until the real battle flow replaces it.
 */
export function CombatScreen({ battle, onEnd }: { battle: PendingBattle; onEnd: () => void }) {
    const fight = FIGHTS[battle.fightId];
    const place = MAP_PLACES.find((entry) => entry.placeId === battle.placeId);

    return (
        <div className="action-bar-demo pixel-font">
            <div className="action-bar-demo-content">
                <div className="pixel-panel">
                    <div className="pixel-title">⚔ Combate</div>
                    <div style={{ fontSize: 'var(--s3)', color: 'var(--muted)', marginBottom: 'var(--s2)' }}>
                        El diálogo encoló esta batalla — la pantalla de combate real está en desarrollo.
                    </div>
                    <div className="team-data-block">
                        <div className="team-data-block-title">Batalla pendiente</div>
                        <div className="equip-line">
                            <span className="inv-item-icon">
                                <span className="material-symbol" style={{ fontSize: 'var(--s4)' }}>swords</span>
                            </span>
                            <span className="equip-line-item">{fight ? fight.id : battle.fightId}</span>
                        </div>
                        <div className="equip-line">
                            <span className="inv-item-icon">
                                <span className="material-symbol" style={{ fontSize: 'var(--s4)' }}>map</span>
                            </span>
                            <span className="equip-line-item">{place ? place.name : battle.placeId}</span>
                        </div>
                        <div className="equip-line">
                            <span className="inv-item-icon">
                                <span className="material-symbol" style={{ fontSize: 'var(--s4)' }}>flag</span>
                            </span>
                            <span className="equip-line-item">{battle.missionId}</span>
                        </div>
                        <div className="equip-line">
                            <span className="inv-item-icon">
                                <span className="material-symbol" style={{ fontSize: 'var(--s4)' }}>groups</span>
                            </span>
                            <span className="equip-line-item">
                                {fight ? `${fight.mode ?? 'turn'} · ${fight.enemies().length} enemigos` : '—'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <OptionsBar
                options={[]}
                back={{
                    label: 'Atrás',
                    onClick: onEnd,
                }}
            />
        </div>
    );
}
