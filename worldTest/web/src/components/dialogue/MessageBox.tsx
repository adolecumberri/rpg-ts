import type { DialogueChoice, MessageLine } from '@core';
import { useGame } from '../../game/GameContext';
import { PORTRAIT_URLS } from '../../constants/portraits';
import { OptionsBar } from '../chrome/OptionsBar';

/**
 * The global story dialogue. When a line is queued it TAKES OVER the
 * main container: the center stage shows the scene (the line bubble,
 * or the prompt of a choice line) and the bottom buttons panel
 * carries the choices — or the Next button. The engine queue
 * (session.messages) is the single source of truth: the view only
 * projects the current line and advances it; when the queue empties
 * it consumes the pending battle and hands it to the router
 * (onBattle), which owns the navigation.
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

// The branch-choice icons: each class job maps to its pixel icon in
// the icons_3 sheet (soldier 1,1 · archer 2,1 · mage 3,2).
const JOB_ICONS: Record<string, string> = {
    soldier: 'espada',
    archer: 'arco',
    healer: 'vara',
};

// The pixel icon of a choice: found through its setJob effect's job.
function choiceIconOf(choice: DialogueChoice): { icon: string; size?: number } | undefined {
    for (const effect of choice.effects) {
        if (effect.kind !== 'setJob') continue;
        const iconId = JOB_ICONS[effect.jobId];
        if (iconId) return { icon: iconId };
    }
    return undefined;
}

/**
 * The dialogue view: overlays the main panel while a line is queued.
 * Lines fade in (no more instant pops); the bottom buttons panel holds
 * the choices (each applies its story effects) or the Next button.
 * When the queue empties, the pending battle (if any) goes to onBattle;
 * otherwise onDone fires (the router lands on the first place).
 */
export function MessageBox({
    onBattle,
    onDone,
}: {
    onBattle?: (battle: PendingBattle) => void;
    onDone?: () => void;
}) {
    const api = useGame();
    const line = api.session.messages.peek();

    if (!line) return null;

    const remaining = api.session.messages.remaining();

    const finishQueue = () => {
        const battle = api.session.consumePendingBattle();
        if (battle) {
            onBattle?.(battle);
            return;
        }
        onDone?.();
    };

    const advance = () => {
        const next = api.session.messages.next();
        api.refresh();
        if (!next) finishQueue();
    };

    // A choice line: picking an option applies its story effects and
    // consumes the line (a choice may queue a battle through its
    // effects — it fires once the queue empties, like any dialogue).
    const choose = (choice: DialogueChoice) => {
        for (const effect of choice.effects) {
            api.session.applyStoryEffect(effect);
        }
        const next = api.session.messages.next();
        api.refresh();
        if (!next) finishQueue();
    };

    const hasChoices = Boolean(line.choices && line.choices.length > 0);

    const stage = hasChoices ? (
        <div key="choice" className="dialog-prompt dialog-line-in">
            <div className="dialog-prompt-speaker">{line.speaker ?? ''}</div>
            <div className="dialog-prompt-text">{line.text}</div>
        </div>
    ) : (
        <div key={line.text} className="dialog-line-in">
            <MessageLineView
                line={line}
                counter={remaining > 1 ? String(remaining) : undefined}
                onAdvance={advance}
            />
        </div>
    );

    const bar = hasChoices ? (
        <OptionsBar
            size="lg"
            fixedRows
            options={line.choices!.map((choice, index) => ({
                id: `choice_${index}`,
                label: choice.label,
                icon: choiceIconOf(choice),
                onClick: () => choose(choice),
            }))}
        />
    ) : (
        <OptionsBar
            size="lg"
            fixedRows
            options={[{
                id: 'next',
                label: 'Next',
                icon: { symbol: 'chevron_right', color: 'var(--accent)' },
                sub: remaining > 1 ? `${remaining} lines left` : 'Continue',
                onClick: advance,
            }]}
        />
    );

    return (
        <div className="dialog-view">
            <div className="dialog-stage">{stage}</div>
            {bar}
        </div>
    );
}
