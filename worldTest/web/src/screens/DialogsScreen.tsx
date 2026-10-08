import { useState } from 'react';
import type { ReactNode } from 'react';
import { CHATS, createInitialMissions } from '@core';
import type { MessageLine } from '@core';
import { useGame } from '../game/GameContext';
import { OptionsBar } from '../components/UI/OptionsBar';
import { MessageLineView } from '../components/UI/MessageBox';

/**
 * The dialogs dev page: a line editor (side, text, portrait) to
 * author new dialogs and a library with the dialogs the missions
 * already use (chats plus every mission step that carries lines).
 * The player renders the same shared MessageLineView as the global
 * story dialogue, so the dev page and the real game share the format.
 */

type DevDialog = {
    id: string;
    title: string;
    source: string;
    lines: MessageLine[];
};

type View = 'home' | 'edit' | 'play';

// The engine line -> display line: sides alternate so every dialog
// shows both halves of the stage.
function toDevLine(line: { speaker: string; text: string }, index: number): MessageLine {
    return {
        side: index % 2 === 0 ? 'left' : 'right',
        text: line.text,
        speaker: line.speaker,
    };
}

// The dialogs the missions already use: every chat plus every mission
// step with lines (dialogue steps and the story lines of travel/hunt/
// task/battle/reward steps).
function libraryDialogs(): DevDialog[] {
    const list: DevDialog[] = [];
    for (const chat of Object.values(CHATS)) {
        list.push({
            id: `chat:${chat.id}`,
            title: chat.id,
            source: 'Chat de misión',
            lines: chat.lines.map(toDevLine),
        });
    }
    for (const mission of createInitialMissions()) {
        for (const step of mission.steps) {
            if (!step.lines || step.lines.length === 0) continue;
            list.push({
                id: `mission:${mission.id}:${step.id}`,
                title: `${mission.title} · ${step.id}`,
                source: `Misión · ${mission.title}`,
                lines: step.lines.map(toDevLine),
            });
        }
    }
    return list;
}

export function DialogsScreen() {
    const api = useGame();
    const library = libraryDialogs();

    const [view, setView] = useState<View>('home');
    // Dialogs authored in this session (in-memory dev data).
    const [custom, setCustom] = useState<DevDialog[]>([]);
    const [draft, setDraft] = useState<DevDialog | null>(null);
    const [playing, setPlaying] = useState<{ dialog: DevDialog; origin: 'edit' | 'library' } | null>(null);
    const [lineIndex, setLineIndex] = useState(0);

    const newDraft = () => {
        setDraft({
            id: `custom_${Date.now()}`,
            title: 'Nuevo diálogo',
            source: 'Creado',
            lines: [{ side: 'left', text: '', portrait: '' }],
        });
        setView('edit');
    };

    const updateLine = (index: number, patch: Partial<MessageLine>) => {
        setDraft((current) => current ? {
            ...current,
            lines: current.lines.map((line, lineIndex) =>
                lineIndex === index ? { ...line, ...patch } : line),
        } : current);
    };

    const addLine = () => {
        setDraft((current) => {
            if (!current) return current;
            const last = current.lines[current.lines.length - 1];
            return {
                ...current,
                lines: [
                    ...current.lines,
                    { side: last && last.side === 'left' ? 'right' : 'left', text: '', portrait: '' },
                ],
            };
        });
    };

    const removeLine = (index: number) => {
        setDraft((current) => current ? {
            ...current,
            lines: [...current.lines.slice(0, index), ...current.lines.slice(index + 1)],
        } : current);
    };

    const saveDraft = () => {
        if (!draft) return;
        setCustom((list) => {
            const exists = list.some((entry) => entry.id === draft.id);
            return exists ?
                list.map((entry) => entry.id === draft.id ? draft : entry) :
                [...list, draft];
        });
        api.showToast('Diálogo guardado.');
        setDraft(null);
        setView('home');
    };

    const startPlay = (dialog: DevDialog, origin: 'edit' | 'library') => {
        setPlaying({ dialog, origin });
        setLineIndex(0);
        setView('play');
    };

    // ------------------------------------------------------------------
    // Content per view.
    // ------------------------------------------------------------------

    let content: ReactNode = null;

    if (view === 'home') {
        content = (
            <>
                {custom.length > 0 ? (
                    <div className="pixel-panel">
                        <div className="pixel-title">Creados</div>
                        {custom.map((entry) => (
                            <button
                                key={entry.id}
                                type="button"
                                className="tactical-menu-row"
                                onClick={() => {
                                    setDraft(entry);
                                    setView('edit');
                                }}
                            >
                                <span className="tactical-icon-frame" aria-hidden="true">
                                    <span className="material-symbol">edit</span>
                                </span>
                                <span className="tactical-menu-text">
                                    <span className="tactical-menu-title-line">
                                        <span className="dlg-row-title">{entry.title}</span>
                                        <span className="tactical-menu-number">
                                            {String(entry.lines.length).padStart(2, '0')}
                                        </span>
                                    </span>
                                    <span className="tactical-menu-caption">{entry.source}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                ) : null}
                <div className="pixel-panel dlg-library-panel">
                    <div className="pixel-title">De las misiones</div>
                    {library.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            className="tactical-menu-row"
                            onClick={() => startPlay(entry, 'library')}
                        >
                            <span className="tactical-icon-frame" aria-hidden="true">
                                <span className="material-symbol">forum</span>
                            </span>
                            <span className="tactical-menu-text">
                                <span className="tactical-menu-title-line">
                                    <span className="dlg-row-title">{entry.title}</span>
                                    <span className="tactical-menu-number">
                                        {String(entry.lines.length).padStart(2, '0')}
                                    </span>
                                </span>
                                <span className="tactical-menu-caption">{entry.source}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </>
        );
    } else if (view === 'edit' && draft) {
        content = (
            <div className="pixel-panel">
                <div className="pixel-title">Editor</div>
                <input
                    className="dev-input dlg-title-input"
                    placeholder="Título del diálogo…"
                    value={draft.title}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
                {draft.lines.map((line, index) => (
                    <div key={index} className="dlg-editor-line">
                        <div className="dlg-editor-row">
                            <button
                                type="button"
                                className={`pixel-btn dlg-side-btn${line.side === 'left' ? ' pixel-btn--primary' : ''}`}
                                title={`Lado: ${line.side === 'left' ? 'izquierdo' : 'derecho'}`}
                                onClick={() => updateLine(index, {
                                    side: line.side === 'left' ? 'right' : 'left',
                                })}
                            >
                                {line.side === 'left' ? 'L' : 'R'}
                            </button>
                            <input
                                className="dev-input"
                                placeholder="Texto de la línea…"
                                value={line.text}
                                onChange={(event) => updateLine(index, { text: event.target.value })}
                            />
                            <button
                                type="button"
                                className="pixel-btn dlg-side-btn"
                                title="Quitar línea"
                                onClick={() => removeLine(index)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="dlg-editor-row">
                            <span className="dlg-editor-label">IMG</span>
                            <input
                                className="dev-input"
                                placeholder="clave (warrior) o url — vacío = genérico"
                                value={line.portrait ?? ''}
                                onChange={(event) => updateLine(index, { portrait: event.target.value })}
                            />
                        </div>
                    </div>
                ))}
            </div>
        );
    } else if (view === 'play' && playing) {
        const total = playing.dialog.lines.length;
        const line = lineIndex < total ? playing.dialog.lines[lineIndex] : undefined;
        content = (
            <>
                <div className="pixel-panel">
                    <div className="pixel-title">{playing.dialog.title}</div>
                    <div style={{ fontSize: 'var(--s3)', color: 'var(--muted)' }}>
                        {playing.dialog.source} · {total} líneas
                    </div>
                </div>
                {line ? (
                    <div className="dlg-stage">
                        <MessageLineView
                            line={line}
                            counter={`${String(lineIndex + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`}
                            onAdvance={() => setLineIndex((index) => index + 1)}
                        />
                    </div>
                ) : (
                    <div className="pixel-panel">
                        <div className="pixel-title">Fin del diálogo</div>
                        <div style={{ fontSize: 'var(--s3)', color: 'var(--muted)' }}>
                            Pulsa Reiniciar para volver a empezar.
                        </div>
                    </div>
                )}
            </>
        );
    }

    // ------------------------------------------------------------------
    // The bar per view.
    // ------------------------------------------------------------------

    const bar = view === 'home' ? (
        <OptionsBar
            options={[{
                id: 'new',
                label: 'Nuevo',
                icon: { symbol: 'add', color: 'var(--accent)' },
                tone: 'primary',
                onClick: newDraft,
            }]}
        />
    ) : view === 'edit' ? (
        <OptionsBar
            options={[
                {
                    id: 'add-line',
                    label: '＋ Línea',
                    icon: { symbol: 'add', color: 'var(--accent)' },
                    onClick: addLine,
                },
                {
                    id: 'save',
                    label: 'Guardar',
                    icon: { symbol: 'save', color: 'var(--accent)' },
                    tone: 'primary',
                    onClick: saveDraft,
                },
                {
                    id: 'play',
                    label: 'Probar',
                    icon: { symbol: 'play_arrow', color: 'var(--accent)' },
                    onClick: () => draft ? startPlay(draft, 'edit') : undefined,
                },
            ]}
            back={{
                label: 'Atrás',
                onClick: () => {
                    setDraft(null);
                    setView('home');
                },
            }}
        />
    ) : playing ? (
        <OptionsBar
            options={[
                {
                    id: 'restart',
                    label: 'Reiniciar',
                    icon: { symbol: 'replay', color: 'var(--accent)' },
                    disabled: lineIndex === 0,
                    onClick: () => setLineIndex(0),
                },
                ...(lineIndex < playing.dialog.lines.length ? [{
                    id: 'next',
                    label: 'Siguiente',
                    icon: { symbol: 'arrow_forward', color: 'var(--accent)' },
                    tone: 'primary' as const,
                    onClick: () => setLineIndex((index) => index + 1),
                }] : []),
                {
                    // Pushes the lines into the engine queue: the real
                    // global MessageBox takes over (and a pending battle
                    // would land on the combat screen).
                    id: 'push',
                    label: 'Al juego',
                    icon: { symbol: 'call', color: 'var(--accent)' },
                    onClick: () => {
                        api.session.messages.push(
                            playing.dialog.lines.map((entry) => ({ ...entry })),
                        );
                        api.refresh();
                    },
                },
            ]}
            back={{
                label: 'Atrás',
                onClick: () => setView(playing.origin === 'edit' ? 'edit' : 'home'),
            }}
        />
    ) : (
        <OptionsBar options={[]} />
    );

    return (
        <div className="action-bar-demo pixel-font">
            <div className="action-bar-demo-content">
                {content}
            </div>
            {bar}
        </div>
    );
}
