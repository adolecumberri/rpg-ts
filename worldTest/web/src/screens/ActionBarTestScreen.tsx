import { useState } from 'react';
import { ActionBar } from '../components/UI/ActionBar';
import type { ActionButton } from '../components/UI/ActionBar';

const CHARACTERS = ['Player', 'Arturo', 'Archer 0'] as const;

const SKILL_SETS: Record<string, ActionButton[]> = {
    Player: [
        { id: 'slash', label: 'Slash', icon: '⚔️', sub: 'short · ⚔️ 11' },
        { id: 'parry', label: 'Parry', icon: '🛡️', sub: 'negates + returns 70%', tone: 'primary' },
        { id: 'haste', label: 'Haste', icon: '⚡', sub: 'speed +8 · 3 turns', disabled: true, disabledReason: 'on cooldown (2 actions)' },
        { id: 'cover', label: 'Cover', icon: '🧱', sub: 'takes 60% of the next hit' },
    ],
    Arturo: [
        { id: 'dispel', label: 'Dispel', icon: '✨', sub: 'cleans debuffs from allies' },
        { id: 'cure', label: 'Cure', icon: '💚', sub: 'heals 60% (max 40)', tone: 'primary' },
        { id: 'defend', label: 'Defend', icon: '🛡️', sub: 'takes 70% less for 1 turn' },
    ],
    'Archer 0': [
        { id: 'weak_point', label: 'Weak Point', icon: '🎯', sub: 'enemy atk/def −40%', tone: 'danger' },
        { id: 'fast_draw', label: 'Fast Draw', icon: '⚡', sub: 'speed +8 · 3 turns' },
        { id: 'defend', label: 'Defend', icon: '🛡️', sub: 'takes 70% less for 1 turn' },
    ],
};

const ENEMIES: ActionButton[] = [
    { id: 'renegade_a', label: 'Farmer Jed', icon: '🌾', sub: 'front · HP 14/14' },
    { id: 'renegade_b', label: 'Farmer Ro', icon: '🌾', sub: 'front · HP 9/14' },
    { id: 'renegade_c', label: 'Farmer Lia', icon: '🌾', sub: 'center · HP 14/14', disabled: true, disabledReason: 'out of reach' },
    { id: 'renegade_d', label: 'Farmer Tom', icon: '🌾', sub: 'back · HP 12/14', disabled: true, disabledReason: 'out of reach' },
];

const MANY_ACTIONS: ActionButton[] = Array.from({ length: 8 }, (_, index) => ({
    id: `skill_${index}`,
    label: `Skill ${index + 1}`,
    icon: '✨',
    sub: index % 3 === 0 ? 'strong against goblins' : `cost ${index + 1}`,
    onClick: () => undefined,
}));

type FlowPhase =
    | { kind: 'skills'; characterIndex: number }
    | { kind: 'targets'; skillLabel: string };

/**
 * Action bar test screen: the bottom bar only exists while there are
 * actions to take. "Start flow" runs the battle loop (skills -> enemy
 * -> next character's skills); "Show 8 actions" demonstrates the
 * pagination (5 per page).
 */
export function ActionBarTestScreen() {
    const [phase, setPhase] = useState<FlowPhase | null>(null);
    const [showMany, setShowMany] = useState(false);
    const [log, setLog] = useState<string[]>([]);

    const actions: ActionButton[] = (() => {
        if (showMany) return MANY_ACTIONS;
        if (!phase) return [];
        if (phase.kind === 'targets') {
            return ENEMIES.map((enemy) => ({
                ...enemy,
                onClick: () => {
                    setLog((lines) => [`${phase.skillLabel} → ${enemy.label}`, ...lines]);
                    setPhase({ kind: 'skills', characterIndex: (indexOf(CHARACTERS, currentCharacter(phase)) + 1) % CHARACTERS.length });
                },
            }));
        }
        const character = CHARACTERS[phase.characterIndex];
        return SKILL_SETS[character].map((skill) => ({
            ...skill,
            onClick: () => {
                setLog((lines) => [`${character} picked ${skill.label}`, ...lines]);
                setPhase({ kind: 'targets', skillLabel: skill.label });
            },
        }));
    })();

    const character = phase?.kind === 'skills' ? CHARACTERS[phase.characterIndex] : undefined;

    return (
        <div className="action-bar-demo pixel-font">
            <div className="action-bar-demo-content">
                <div className="pixel-panel">
                    <div className="pixel-title">Action bar</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                        The bar sits at the very bottom and exists only while there are actions:
                        1–3 stack, 4 is 2×2, 5 is 2×2+1, 6+ paginates.
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                            className="pixel-btn pixel-btn--primary"
                            onClick={() => {
                                setShowMany(false);
                                setPhase({ kind: 'skills', characterIndex: 0 });
                            }}
                        >
                            ▶ Start flow
                        </button>
                        <button
                            className="pixel-btn"
                            onClick={() => {
                                setPhase(null);
                                setShowMany(true);
                            }}
                        >
                            Show 8 actions
                        </button>
                        <button
                            className="pixel-btn"
                            onClick={() => {
                                setPhase(null);
                                setShowMany(false);
                            }}
                        >
                            Hide bar
                        </button>
                    </div>
                </div>

                {character ? (
                    <div className="pixel-panel">
                        <div className="pixel-title">Turn</div>
                        <div style={{ fontSize: 12 }}>
                            {character}'s pick
                            {phase?.kind === 'targets' ? ` — ${phase.skillLabel} on whom?` : ' — choose a skill'}
                        </div>
                    </div>
                ) : null}

                {log.length > 0 ? (
                    <div className="pixel-panel">
                        <div className="pixel-title">Log</div>
                        {log.slice(0, 4).map((line, index) => (
                            <div key={index} style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                                {line}
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            <ActionBar actions={actions} />
        </div>
    );
}

function currentCharacter(phase: FlowPhase): string {
    if (phase.kind === 'skills') return CHARACTERS[phase.characterIndex];
    return CHARACTERS[0];
}

function indexOf(list: readonly string[], value: string): number {
    return list.indexOf(value);
}
