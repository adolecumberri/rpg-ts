import { FLAGS } from '@core';
import { useGame } from '../game/GameContext';
import { OptionsBar } from '../components/UI/OptionsBar';

/**
 * The flags dev section: one row per dictionary flag with its toggle.
 * Turning a flag on writes it into the travel unlocks AND the story
 * registry; turning it off removes it from both. Purely a dev tool to
 * exercise the map locks and the mission flow.
 */
export function FlagsScreen({ onBack }: { onBack?: () => void }) {
    const api = useGame();
    const entries = Object.entries(FLAGS) as Array<[string, string]>;

    const isOn = (value: string): boolean =>
        api.session.unlocked.has(value) || api.session.flags.has(value);

    const toggle = (value: string) => {
        if (isOn(value)) {
            api.session.unlocked.delete(value);
            api.session.flags.remove(value);
        } else {
            api.session.unlocked.add(value);
            api.session.flags.set(value);
        }
        api.refresh();
    };

    const allOn = entries.every(([, value]) => isOn(value));
    const toggleAll = () => {
        for (const [, value] of entries) {
            if (allOn) {
                api.session.unlocked.delete(value);
                api.session.flags.remove(value);
            } else {
                api.session.unlocked.add(value);
                api.session.flags.set(value);
            }
        }
        api.refresh();
    };

    return (
        <div className="pixel-font" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="team-main">
                <div className="pixel-panel dlg-library-panel">
                    <div className="pixel-title">Story Flags</div>
                    <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s2)' }}>
                        <button type="button" className="pixel-btn" onClick={toggleAll}>
                            {allOn ? 'All off' : 'All on'}
                        </button>
                    </div>
                    {entries.map(([name, value]) => (
                        <button
                            key={name}
                            type="button"
                            className={`item-page-row${isOn(value) ? ' inv-item-row--preview' : ''}`}
                            onClick={() => toggle(value)}
                        >
                            <span className="item-page-info">
                                <span className="item-page-name">{name}</span>
                                <span className="item-page-desc">{value}</span>
                            </span>
                            <span className="inv-count" style={{ color: isOn(value) ? 'var(--accent)' : 'var(--muted)' }}>
                                {isOn(value) ? 'ON' : 'OFF'}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
            <OptionsBar
                size="lg"
                options={[]}
                back={onBack ? { label: 'Atrás', onClick: onBack } : undefined}
            />
        </div>
    );
}
