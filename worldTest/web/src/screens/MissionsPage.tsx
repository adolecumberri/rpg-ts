import { useState } from 'react';
import { PLACES_BY_ID, seasonNameForMonth } from '@core';
import type { Mission, MissionRunner } from '@core';
import { useGame } from '../game/GameContext';
import { OptionsBar } from '../components/UI/OptionsBar';
import { MissionTable } from '../components/UI/MissionTable';
import type { MissionTableRow } from '../components/UI/MissionTable';

/**
 * The mission page: one board rendered through the same MissionTable,
 * plus the mission details view (description wrapped to 8 rows of 50
 * characters, the required items, the reward, the expedition and
 * cancellation notes, and the place with the expedition members).
 *
 * The board mode shows the Nuevas and Otras tabs (the Days column: the
 * deadline window in Nuevas, the countdown until an out-of-season
 * mission returns in Otras). The party view (ownedOnly) has no header
 * tabs and stays on the accepted missions.
 */
const TABS = [
    { id: 'new', label: 'Nuevas' },
    { id: 'other', label: 'Otras' },
    { id: 'accepted', label: 'Aceptadas' },
] as const;

export type MissionTabId = typeof TABS[number]['id'];

const DESCRIPTION_COLS = 50;
const DESCRIPTION_ROWS = 8;

/** Wraps the description to at most 8 rows of 50 characters. */
function wrapDescription(text: string): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (next.length > DESCRIPTION_COLS) {
            if (line) lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }
    if (line) lines.push(line);
    if (lines.length > DESCRIPTION_ROWS) {
        lines.length = DESCRIPTION_ROWS;
        lines[DESCRIPTION_ROWS - 1] = `${lines[DESCRIPTION_ROWS - 1].slice(0, DESCRIPTION_COLS - 1)}…`;
    }
    return lines;
}

export function MissionsPage({
    onBack,
    initialTab = 'new',
    ownedOnly = false,
}: {
    onBack?: () => void;
    initialTab?: MissionTabId;
    // The party view: no header tabs, straight to the accepted missions.
    ownedOnly?: boolean;
}) {
    const api = useGame();
    const [tab, setTab] = useState<MissionTabId>(ownedOnly ? 'accepted' : initialTab);
    // The mission whose details are open (null = the board).
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // The tabs the header offers: the board shows Nuevas and Otras (the
    // accepted missions belong to the party view only).
    const boardTabs = TABS.filter((entry) => entry.id !== 'accepted');
    const activeTab: MissionTabId = ownedOnly ? 'accepted' : tab;

    const placeId = api.session.currentPlaceId;
    const today = api.session.calendar.totalDays();

    // The Days cell of an offered mission: the deadline window the
    // player gets once they accept it (Nuevas), or the countdown until
    // an out-of-season mission becomes available again (Otras).
    const daysOf = (mission: Mission, tab: MissionTabId): string => {
        if (tab === 'other') {
            const days = api.session.missions.daysUntilAvailable(mission.id);
            return days !== undefined ? `${days}d` : '—';
        }
        return mission.daysAvailable !== undefined ? `${mission.daysAvailable}d` : '—';
    };

    const rowOf = (mission: Mission, tab: MissionTabId): MissionTableRow => ({
        id: mission.id,
        title: mission.title,
        level: mission.level ?? 1,
        days: daysOf(mission, tab),
        commission: mission.commission ?? 0,
        repeat: api.session.missions.timesCompleted(mission.id) > 0,
    });

    const ownedRowOf = (runner: MissionRunner): MissionTableRow => {
        const mission = api.session.missions.mission(runner.missionId());
        return {
            id: runner.missionId(),
            title: runner.title(),
            level: mission?.level ?? 1,
            days: runner.deadlineDay !== undefined ?
                `${Math.max(0, runner.deadlineDay - today)} left` :
                '—',
            commission: mission?.commission ?? 0,
        };
    };

    const itemName = (itemId: string): string =>
        api.session.itemTable.get(itemId)?.name ?? itemId;

    const accept = (id: string) => {
        const gate = api.session.missionAcceptGate(id);
        if (!gate.ok) {
            api.showToast(gate.reason ?? 'You cannot accept this mission.');
            return;
        }
        const ok = api.session.startMission(id);
        api.refresh();
        api.showToast(ok ? 'Mission accepted.' : 'Could not accept the mission.');
        setSelectedId(null);
    };

    // ------------------------------------------------------------------
    // The details view.
    // ------------------------------------------------------------------
    if (selectedId) {
        const mission = api.session.missions.mission(selectedId);
        if (!mission) {
            setSelectedId(null);
        } else {
            const details = mission.details;
            const owned = api.session.missions.runner(selectedId) !== undefined;
            // Missions that do not meet their conditions (the Otras
            // ones, out of season) cannot be accepted: the button is
            // disabled with the gate's reason.
            const acceptGate = owned ? undefined : api.session.missionAcceptGate(selectedId);
            const cancelable = details?.cancelable !== false;
            const required = details?.requiredItems ?? mission.requirements?.items ?? [];
            const rewards = details?.rewards ?? [];
            const rewardGold = details?.rewardGold ?? 0;
            const members = details?.expedition?.members ?? 1;
            const placeName = details?.placeId ?
                PLACES_BY_ID[details.placeId]?.name ?? details.placeId :
                '—';

            const memberIcons = members > 6 ? (
                <span className="mission-members">
                    <span className="mission-member-icon material-symbol" aria-hidden="true">person</span>
                    <span className="mission-members-count">x{members}</span>
                </span>
            ) : (
                <span className="mission-members">
                    {Array.from({ length: members }, (entry, index) => (
                        <span
                            key={index}
                            className="mission-member-icon material-symbol"
                            aria-hidden="true"
                        >
                            person
                        </span>
                    ))}
                </span>
            );

            return (
                <div
                    className="pixel-font"
                    style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                >
                    <div className="team-main">
                        <div className="pixel-panel dlg-library-panel">
                            <div className="pixel-title">{mission.title}</div>
                            <div className="mission-detail-desc">
                                {wrapDescription(details?.description ?? mission.description ?? '').map(
                                    (line, index) => (
                                        <div key={index} className="mission-detail-line">{line}</div>
                                    ),
                                )}
                            </div>

                            <div className="mission-detail-section">
                                <div className="mission-detail-label">OBJETOS NECESARIOS</div>
                                {required.length === 0 ? (
                                    <div className="mission-detail-text">-</div>
                                ) : (
                                    required.map((entry) => (
                                        <div key={entry.itemId} className="mission-detail-item">
                                            {entry.quantity}× {itemName(entry.itemId)}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mission-detail-section">
                                <div className="mission-detail-label">RECOMPENSA</div>
                                {rewards.map((entry) => (
                                    <div key={entry.itemId} className="mission-detail-item">
                                        {entry.quantity}× {itemName(entry.itemId)}
                                    </div>
                                ))}
                                {rewardGold > 0 ? (
                                    <div className="mission-detail-item mission-detail-gold">
                                        +{rewardGold} G
                                    </div>
                                ) : null}
                            </div>

                            <div className="mission-detail-text">
                                {members > 0 ?
                                    `Puedes enviar una expedición de ${members} personajes.` :
                                    'No puedes enviar una expedición.'}
                            </div>
                            <div className="mission-detail-text">
                                {cancelable ?
                                    'Puedes cancelar esta misión.' :
                                    'Esta misión no se puede cancelar.'}
                            </div>
                            {mission.availableMonths &&
                                mission.availableMonths.indexOf(api.session.calendar.monthIndex()) === -1 ? (
                                    <div className="mission-detail-text mission-detail-season">
                                        {`Solo disponible en ${seasonNameForMonth(mission.availableMonths[0])}.`}
                                    </div>
                                ) : null}

                            <div className="mission-detail-section">
                                <div className="mission-detail-label">LUGAR</div>
                                <div className="mission-detail-place">
                                    <span className="mission-detail-place-name">{placeName}</span>
                                    {memberIcons}
                                </div>
                            </div>
                        </div>
                    </div>

                    <OptionsBar
                        fixedRows
                        options={owned ? [{
                            id: 'cancel',
                            label: 'Cancelar',
                            icon: { symbol: 'close', color: '#f2ca50' },
                            tone: 'danger',
                            slot: 3,
                            wide: true,
                            disabled: !cancelable,
                            disabledReason: 'Esta misión no se puede cancelar.',
                            onClick: () => {
                                const ok = api.session.cancelMission(selectedId);
                                api.refresh();
                                api.showToast(ok ? 'Mission cancelled.' : 'Could not cancel the mission.');
                                setSelectedId(null);
                            },
                        }] : [{
                            id: 'accept',
                            label: 'Aceptar',
                            icon: { symbol: 'check', color: '#f2ca50' },
                            tone: 'primary',
                            slot: 3,
                            wide: true,
                            disabled: acceptGate !== undefined && !acceptGate.ok,
                            disabledReason: acceptGate && !acceptGate.ok ? acceptGate.reason : undefined,
                            onClick: () => accept(selectedId),
                        }]}
                        back={{ label: 'Atrás', wide: true, onClick: () => setSelectedId(null) }}
                    />
                </div>
            );
        }
    }

    // ------------------------------------------------------------------
    // The board.
    // ------------------------------------------------------------------
    const rows: MissionTableRow[] = activeTab === 'new' ?
        api.session.missions.newMissions(placeId).map((mission) => rowOf(mission, 'new')) :
        activeTab === 'accepted' ?
            api.session.missions.ownedMissions().map(ownedRowOf) :
            api.session.missions.otherMissions(placeId).map((mission) => rowOf(mission, 'other'));

    // Opening the details keeps the mission where it is: Nuevas holds
    // every mission currently available, Otras the out-of-season ones.
    const openDetails = (id: string) => {
        setSelectedId(id);
    };

    return (
        <div className="pixel-font" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="team-main">
                <div className="pixel-panel dlg-library-panel">
                    {!ownedOnly ? (
                        <div className="mission-tabs">
                            {boardTabs.map((entry) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    className={`pixel-btn${activeTab === entry.id ? ' pixel-btn--primary' : ''}`}
                                    onClick={() => setTab(entry.id)}
                                >
                                    {entry.label}
                                </button>
                            ))}
                        </div>
                    ) : null}
                    <MissionTable rows={rows} onSelect={openDetails} />
                </div>
            </div>
            <OptionsBar
                options={[]}
                back={onBack ? { label: 'Atrás', onClick: onBack } : undefined}
            />
        </div>
    );
}
