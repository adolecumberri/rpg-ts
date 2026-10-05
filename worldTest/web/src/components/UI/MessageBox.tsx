import type { MessageLine } from '@core';
import { useGame } from '../../game/GameContext';
import { PORTRAIT_URLS } from '../../constants/portraits';

/**
 * The global story dialogue, mounted once at the shell root. The
 * engine queue (session.messages) is the single source of truth:
 * MessageLineView only projects the current line, and MessageBox
 * advances it — when the queue empties it consumes the pending battle
 * and hands it to the router (onBattle), which owns the navigation.
 */

// The one-shot battle the session queued behind a dialogue.
export type PendingBattle = {
    fightId: string;
    placeId: string;
    missionId: string;
};

// A portrait key ('warrior') resolves to its asset; anything else is
// treated as a URL. Empty = the generic placeholder frame.
export function resolvePortrait(raw?: string): string {
    if (!raw) return '';
    return PORTRAIT_URLS[raw] ?? raw;
}

/**
 * One dialogue line: the portrait and the bubble share the box; the
 * side decides which one sits left (the design's two-sided dialog).
 * Pure presentation — the caller advances the queue.
 */
export function MessageLineView({
    line,
    counter,
    onAdvance,
}: {
    line: MessageLine;
    // The small right-aligned progress ('02/05' or a remaining count).
    counter?: string;
    onAdvance: () => void;
}) {
    const img = resolvePortrait(line.portrait);
    const portrait = img ? (
        <img className="messagebox-portrait" src={img} alt={line.speaker ?? ''} />
    ) : (
        <div className="messagebox-portrait messagebox-portrait--empty" aria-hidden="true">
            <span className="material-symbol">person</span>
        </div>
    );
    const body = (
        <div className="messagebox-body">
            <div className="messagebox-head">
                <span className="messagebox-speaker">{line.speaker ?? ''}</span>
                <span className="messagebox-meta">
                    {counter ? <span className="messagebox-counter">{counter}</span> : null}
                    <span className="messagebox-next material-symbol" aria-hidden="true">chevron_right</span>
                </span>
            </div>
            <div className="messagebox-text">{line.text}</div>
        </div>
    );

    // The portrait is absolutely anchored (overflowing the box's top
    // edge): the side class decides left or right, and the body pads
    // itself away from it.
    const sideClass = `messagebox--side-${line.side === 'right' ? 'right' : 'left'}`;

    return (
        <div
            className={`messagebox ${sideClass}`}
            role="button"
            aria-label="Next"
            onClick={onAdvance}
        >
            {portrait}
            {body}
        </div>
    );
}

/**
 * The live dialog box over every screen: reads the queue's current
 * line, advances on tap, and reports the pending battle when the
 * lines finish. Mounted once, so arrival chats, mission dialogues and
 * future mid-battle lines all flow through the same display.
 */
export function MessageBox({ onBattle }: { onBattle?: (battle: PendingBattle) => void }) {
    const api = useGame();
    const line = api.session.messages.peek();

    if (!line) return null;

    const remaining = api.session.messages.remaining();

    const advance = () => {
        const next = api.session.messages.next();
        api.refresh();
        if (!next) {
            const battle = api.session.consumePendingBattle();
            if (battle) onBattle?.(battle);
        }
    };

    return (
        <>
            {/* The dialog is modal: this layer covers the whole canvas,
                so nothing behind the story lines can be clicked. */}
            <div className="messagebox-overlay" onClick={advance} />
            {/* The global box floats above the bottom action tray (the
                design's 48u tray), so it never covers the buttons. */}
            <div className="messagebox-global">
                <MessageLineView
                    line={line}
                    counter={remaining > 1 ? String(remaining) : undefined}
                    onAdvance={advance}
                />
            </div>
        </>
    );
}
