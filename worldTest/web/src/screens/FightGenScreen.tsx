import { useMemo, useState } from 'react';
import { ArmySetup } from '../components/UI/ArmySetup';
import { Fight } from '../components/UI/Fight';
import type { FightMode } from '../components/UI/Fight';
import { unitsOfArmy } from '../game/armyPresets';
import type { ArmyGroup } from '../game/armyPresets';

type Step = 'type' | 'armyA' | 'armyB' | 'fight';

/**
 * Fight gen: the specific screen of the generic Fight component. The
 * flow is: pick the fight type (ticks or actions) → build team A →
 * build team B → the fight itself. Both team pages reuse the same
 * ArmySetup component; the armies are plain groups and Fight builds
 * nothing — it only receives the two teams.
 */
export function FightGenScreen() {
    const [step, setStep] = useState<Step>('type');
    const [mode, setMode] = useState<FightMode>('actions');
    const [armyA, setArmyA] = useState<ArmyGroup[]>([]);
    const [armyB, setArmyB] = useState<ArmyGroup[]>([]);
    // Remounts Fight on every new entry so it starts from a fresh
    // snapshot of the armies.
    const [fightKey, setFightKey] = useState(0);

    const teamA = useMemo(() => unitsOfArmy(armyA, 'a'), [armyA]);
    const teamB = useMemo(() => unitsOfArmy(armyB, 'b'), [armyB]);

    if (step === 'type') {
        return (
            <div className="newui-page pixel-font">
                <div className="pixel-panel">
                    <div className="pixel-title">Fight Gen</div>
                    <div style={{ fontSize: 'var(--s3)', color: 'var(--muted)', marginBottom: 'var(--s2)' }}>
                        Pick the fight type:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button
                            type="button"
                            className="pixel-btn pixel-btn--primary"
                            style={{ height: 'auto', padding: 'var(--s2)', textAlign: 'left' }}
                            onClick={() => {
                                setMode('ticks');
                                setStep('armyA');
                            }}
                        >
                            <div style={{ fontSize: 'var(--s4)' }}>⚙️ Ticks</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'none' }}>
                                Auto battle, no action menu, 80v80-style battlefield.
                            </div>
                        </button>
                        <button
                            type="button"
                            className="pixel-btn"
                            style={{ height: 'auto', padding: 'var(--s2)', textAlign: 'left' }}
                            onClick={() => {
                                setMode('actions');
                                setStep('armyA');
                            }}
                        >
                            <div style={{ fontSize: 'var(--s4)' }}>🎮 Actions</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'none' }}>
                                Turn-based with the action menu.
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'armyA' || step === 'armyB') {
        const isA = step === 'armyA';
        return (
            <ArmySetup
                title={isA ? 'Team A' : 'Team B'}
                groups={isA ? armyA : armyB}
                onChange={isA ? setArmyA : setArmyB}
                onBack={() => setStep(isA ? 'type' : 'armyA')}
                nextLabel={isA ? 'Next: Team B' : 'Start fight'}
                onNext={() => {
                    if (isA) {
                        setStep('armyB');
                    } else {
                        setFightKey((key) => key + 1);
                        setStep('fight');
                    }
                }}
            />
        );
    }

    return (
        <Fight
            key={fightKey}
            mode={mode}
            teamA={teamA}
            teamB={teamB}
            labels={{ a: 'Team A', b: 'Team B' }}
            onExit={() => setStep('armyA')}
        />
    );
}
