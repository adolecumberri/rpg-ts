import { useState } from 'react';
import { ROWS, reachableRows } from '@core';
import { OptionsBar } from '../components/UI/OptionsBar';
import type { OptionSpec } from '../components/UI/OptionsBar';
import { TargetBar } from '../components/UI/TargetBar';
import type { TargetSpec } from '../components/UI/TargetBar';
import { Battlefield } from '../components/UI/Battlefield';
import type { ActionBarSize } from '../components/UI/ActionBar';
import { selectionRulesOf, toggleTarget } from '../game/targeting';

type TargetSide = 'ENEMY' | 'ALLY' | 'ANY' | 'ALL_ENEMIES' | 'ALL_ALLIES' | 'SELF';

type TestSkill = {
    id: string;
    label: string;
    icon: string;
    targeting: TargetSide;
    // How many targets the user picks (0 = all of the pool).
    count: number;
    // 'unique' (wide attack): each target at most once.
    // 'multi_hit' (fast hits): the same target may stack several hits.
    mode?: 'unique' | 'multi_hit';
    // 'weapon' = the actor's reach applies; spells default to 'all'.
    reach?: 'weapon' | 'all';
};

// One skill per targeting type, plus both multi-target semantics.
const TEST_SKILLS: TestSkill[] = [
    { id: 'attack', label: 'Attack', icon: '⚔️', targeting: 'ENEMY', count: 1, reach: 'weapon' },
    { id: 'slash', label: 'Slash', icon: '⚔️', targeting: 'ENEMY', count: 1, reach: 'weapon' },
    { id: 'triple', label: 'Triple Slash', icon: '⚔️', targeting: 'ENEMY', count: 3, mode: 'unique', reach: 'weapon' },
    { id: 'rapid', label: 'Rapid Hits', icon: '⚡', targeting: 'ENEMY', count: 3, mode: 'multi_hit', reach: 'weapon' },
    { id: 'cover', label: 'Cover', icon: '🧱', targeting: 'ALLY', count: 1 },
    { id: 'cure', label: 'Cure', icon: '💚', targeting: 'ANY', count: 1 },
    { id: 'fire', label: 'Fire Breath', icon: '🔥', targeting: 'ALL_ENEMIES', count: 0 },
    { id: 'rally', label: 'Rally', icon: '📯', targeting: 'ALL_ALLIES', count: 0 },
    { id: 'defend', label: 'Defend', icon: '🛡️', targeting: 'SELF', count: 0 },
];

// The acting character: its own page for SELF skills.
const ACTOR: Dummy = { id: 'player', name: 'Player', icon: '🧑‍🌾', row: 'front', hp: 25 };

type Dummy = { id: string; name: string; icon: string; row: 'front' | 'center' | 'back'; hp: number };

// The enemy team: nine dummies, three per row.
const ENEMY_TEAM: Dummy[] = [
    { id: 'd_f0', name: 'Front 1', icon: '👺', row: 'front', hp: 20 },
    { id: 'd_f1', name: 'Front 2', icon: '👺', row: 'front', hp: 14 },
    { id: 'd_f2', name: 'Front 3', icon: '👺', row: 'front', hp: 20 },
    { id: 'd_c0', name: 'Center 1', icon: '👺', row: 'center', hp: 20 },
    { id: 'd_c1', name: 'Center 2', icon: '👺', row: 'center', hp: 9 },
    { id: 'd_c2', name: 'Center 3', icon: '👺', row: 'center', hp: 20 },
    { id: 'd_b0', name: 'Back 1', icon: '👺', row: 'back', hp: 20 },
    { id: 'd_b1', name: 'Back 2', icon: '👺', row: 'back', hp: 20 },
    { id: 'd_b2', name: 'Back 3', icon: '👺', row: 'back', hp: 17 },
];

// Three allies; only the Player acts and carries the test skills.
const ALLY_POOL: Dummy[] = [
    { id: 'arturo', name: 'Arturo', icon: '✨', row: 'center', hp: 12 },
    { id: 'archer_0', name: 'Archer 0', icon: '🏹', row: 'back', hp: 12 },
];

const MANY_OPTIONS: OptionSpec[] = Array.from({ length: 12 }, (_, index) => ({
    id: `skill_${index}`,
    label: `Skill ${index + 1}`,
    icon: '✨',
    onClick: () => undefined,
}));

type FlowPhase =
    | { kind: 'skills' }
    | { kind: 'targets'; skill: TestSkill; selected: string[] };

// The pickable pool for a targeting type.
function poolFor(targeting: TargetSide): Dummy[] {
    if (targeting === 'ENEMY' || targeting === 'ALL_ENEMIES') return ENEMY_TEAM;
    if (targeting === 'ALLY' || targeting === 'ALL_ALLIES') return ALLY_POOL;
    if (targeting === 'SELF') return [ACTOR];
    return [...ENEMY_TEAM, ...ALLY_POOL];
}

// The dummies the actor's reach can hit (short = closest filled row,
// long = that row plus the next, all = every row).
function reachableIdsIn(pool: Dummy[], range: 'short' | 'long' | 'all'): Set<string> {
    const occupied = ROWS.filter((row) => pool.some((member) => member.row === row));
    const rows = reachableRows(range, occupied);
    return new Set(
        pool.filter((member) => rows.indexOf(member.row) !== -1).map((member) => member.id),
    );
}

/**
 * Action bar test screen. "Start flow" puts one acting character
 * against nine dummies (3 per row) with one skill per targeting type.
 * The screen owns the phase; OptionsBar renders the skill list and
 * TargetBar renders every selection flavor (single, wide, multi-hit,
 * prefilled all/self) with the shared ActionBar engine underneath.
 */
export function ActionBarTestScreen() {
    const [phase, setPhase] = useState<FlowPhase | null>(null);
    const [showMany, setShowMany] = useState(false);
    const [size, setSize] = useState<ActionBarSize>('lg');
    const [reach, setReach] = useState<'short' | 'long' | 'all'>('short');
    const [log, setLog] = useState<string[]>([]);

    const logLine = (text: string) => setLog((lines) => [text, ...lines].slice(0, 6));

    const toggle = (id: string) => {
        setPhase((current) => {
            if (current?.kind !== 'targets') return current;
            const rules = selectionRulesOf({
                targeting: current.skill.targeting,
                count: current.skill.count,
                poolSize: poolFor(current.skill.targeting).length,
                multiHit: current.skill.mode === 'multi_hit',
            });
            return { ...current, selected: toggleTarget(current.selected, id, rules) };
        });
    };

    const commit = (skill: TestSkill, selected: string[]) => {
        const pool = poolFor(skill.targeting);
        const distinct = new Set(selected).size;
        const text = skill.count === 1
            ? (pool.find((member) => member.id === selected[0])?.name ?? selected[0])
            : skill.count === 0
                ? `all ${selected.length} targets`
                : skill.mode === 'multi_hit'
                    ? `${selected.length} hits on ${distinct} target${distinct === 1 ? '' : 's'}`
                    : `${selected.length} targets`;
        logLine(`${skill.label} → ${text}`);
        setPhase({ kind: 'skills' });
    };

    const openTargets = (skill: TestSkill) => {
        const pool = poolFor(skill.targeting);
        const prefilled = skill.count === 0;
        setPhase({
            kind: 'targets',
            skill,
            selected: prefilled ? pool.map((member) => member.id) : [],
        });
    };

    const skillOptions: OptionSpec[] = TEST_SKILLS.map((skill) => ({
        id: skill.id,
        label: skill.label,
        icon: skill.icon,
        onClick: () => openTargets(skill),
    }));

    const targetsPhase = phase?.kind === 'targets' ? phase : undefined;
    // Weapon skills respect the actor's reach; spells default to 'all'.
    const reachableSet = targetsPhase
        ? targetsPhase.skill.reach === 'weapon'
            ? reachableIdsIn(poolFor(targetsPhase.skill.targeting), reach)
            : undefined
        : undefined;
    const targets: TargetSpec[] = targetsPhase
        ? poolFor(targetsPhase.skill.targeting).map((member) => ({
            id: member.id,
            label: member.name,
            icon: member.icon,
            reachable: reachableSet ? reachableSet.has(member.id) : true,
        }))
        : [];
    const rules = targetsPhase
        ? selectionRulesOf({
            targeting: targetsPhase.skill.targeting,
            count: targetsPhase.skill.count,
            poolSize: targets.length,
            multiHit: targetsPhase.skill.mode === 'multi_hit',
        })
        : undefined;

    return (
        <div className="action-bar-demo pixel-font">
            <div className="action-bar-demo-content">
                <div className="pixel-panel">
                    <div className="pixel-title">Action bar flow</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        {(['sm', 'md', 'lg'] as ActionBarSize[]).map((entry) => (
                            <button
                                key={entry}
                                className={`pixel-btn${size === entry ? ' pixel-btn--primary' : ''}`}
                                style={{ height: 'var(--s8)' }}
                                onClick={() => setSize(entry)}
                            >
                                {entry}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                            className="pixel-btn pixel-btn--primary"
                            onClick={() => {
                                setShowMany(false);
                                setPhase({ kind: 'skills' });
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
                            Show 12 options
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

                {phase ? (
                    <div className="pixel-panel">
                        <div className="pixel-title">
                            {phase.kind === 'skills'
                                ? "Player's pick — choose a skill"
                                : `${phase.skill.label}: ${selectionRulesOf({
                                    targeting: phase.skill.targeting,
                                    count: phase.skill.count,
                                    poolSize: poolFor(phase.skill.targeting).length,
                                    multiHit: phase.skill.mode === 'multi_hit',
                                }).max} target${phase.skill.count === 1 ? '' : 's'}`}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                            Only the Player acts. Allies: Arturo (✨ center) · Archer 0 (🏹 back).
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Actor reach (weapon skills):</span>
                            {(['short', 'long', 'all'] as const).map((entry) => (
                                <button
                                    key={entry}
                                    className={`pixel-btn${reach === entry ? ' pixel-btn--primary' : ''}`}
                                    style={{ height: 'var(--s8)', padding: '0 var(--s2)' }}
                                    onClick={() => setReach(entry)}
                                >
                                    {entry}
                                </button>
                            ))}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>
                            Spells (Cover, Cure, Fire Breath, Rally, Defend) default to reach 'all'.
                        </div>
                        <Battlefield
                            title="Enemies"
                            units={ENEMY_TEAM.map((member) => ({
                                id: member.id,
                                name: member.name,
                                icon: member.icon,
                                row: member.row,
                                hp: member.hp,
                                maxHp: 20,
                            }))}
                            selectedIds={
                                phase.kind === 'targets' ? new Set(phase.selected) : new Set()
                            }
                        />
                    </div>
                ) : null}

                {log.length > 0 ? (
                    <div className="pixel-panel">
                        <div className="pixel-title">Log</div>
                        {log.map((line, index) => (
                            <div key={index} style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                                {line}
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            {showMany ? (
                <OptionsBar options={MANY_OPTIONS} size={size} />
            ) : targetsPhase && rules ? (
                <TargetBar
                    targets={targets}
                    rules={rules}
                    selection={targetsPhase.selected}
                    onToggle={toggle}
                    onAccept={() => commit(targetsPhase.skill, targetsPhase.selected)}
                    onCancel={() => setPhase({ kind: 'skills' })}
                />
            ) : (
                <OptionsBar options={skillOptions} size="lg" />
            )}
        </div>
    );
}
