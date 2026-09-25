import { useGame } from '../game/GameContext';
import { FIGHTS } from '@core';
import { portraitUrl } from '../constants/portraits';

/**
 * The global story message box: fixed at the bottom, over every screen.
 * Shows the speaker's name and portrait, and advances on tap. When the
 * lines finish and the session queued an arrival battle, it starts.
 */
export function MessageBox() {
    const api = useGame();
    const line = api.session.messages.peek();

    if (!line) return null;

    const advance = () => {
        const next = api.session.messages.next();
        api.refresh();
        if (!next) {
            const battle = api.session.consumePendingBattle();
            if (battle) {
                // Hybrid fights (auto farmers + manual player) get their
                // own screen; everything else stays turn-based.
                const hybrid = FIGHTS[battle.fightId]?.mode === 'hybrid';
                api.navigate(hybrid
                    ? {
                        name: 'hybrid',
                        fightId: battle.fightId,
                        placeId: battle.placeId,
                        missionId: battle.missionId,
                    }
                    : {
                        name: 'combat',
                        fightId: battle.fightId,
                        placeId: battle.placeId,
                        missionId: battle.missionId,
                    });
            }
        }
    };

    return (
        <>
            {/* The dialog is modal: this layer covers the whole screen,
                so nothing behind the story lines can be clicked. */}
            <div className="messagebox-overlay" onClick={advance} />
            <div className="messagebox" onClick={advance}>
                <img className="messagebox-portrait" src={portraitUrl(line.portrait)} alt={line.speaker ?? ''} />
                <div className="messagebox-body">
                    {line.speaker ? <div className="messagebox-speaker">{line.speaker}</div> : null}
                    <div className="messagebox-text">{line.text}</div>
                </div>
                <div className="messagebox-next">Next ▶</div>
            </div>
        </>
    );
}
