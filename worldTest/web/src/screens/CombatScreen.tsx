import { useEffect, useReducer, useRef, useState } from 'react';
import { Team } from '@rpg';
import type { Character } from '@rpg';
import { CombatEngine } from '@rpg/classes/Combat/CombatEngine';
import type { Skill } from '@rpg/classes/Skills';
import { makeAttackSkill, makeGroupTeam } from '../game/data';
import { useGame } from '../game/GameContext';
import { StatBar } from '../components/StatBar';

type Phase = 'pick-skill' | 'pick-target' | 'enemy' | 'won' | 'lost';
type LogEntry = { text: string; kind: 'info' | 'damage' | 'heal' };

export function CombatScreen({
    npcId,
    placeId,
    group,
}: {
    npcId?: string;
    placeId: string;
    group?: boolean;
}) {
    const api = useGame();
    const engineRef = useRef<CombatEngine>();
    if (!engineRef.current) engineRef.current = new CombatEngine();

    const npc = npcId ? api.findNpc(npcId) : undefined;

    const [enemyTeam] = useState<Team>(() => {
        if (group) return makeGroupTeam();
        return new Team({ id: 'enemy', members: npc ? [npc.character] : [] });
    });

    const allies = api.team;

    const [phase, setPhase] = useState<Phase>('pick-skill');
    const [round, setRound] = useState(1);
    const [activeIndex, setActiveIndex] = useState(0);
    const [pendingSkill, setPendingSkill] = useState<Skill | null>(null);
    const [log, setLog] = useState<LogEntry[]>([{ text: 'The battle begins!', kind: 'info' }]);
    const [, bump] = useReducer((x: number) => x + 1, 0);

    const aliveAllies = allies.getAlive();
    const aliveEnemies = enemyTeam.getAlive();
    const active = aliveAllies[activeIndex % Math.max(1, aliveAllies.length)];

    const push = (text: string, kind: LogEntry['kind'] = 'info') =>
        setLog((prev) => [...prev, { text, kind }]);

    const checkEnd = (): boolean => {
        if (enemyTeam.getAlive().length === 0) {
            setPhase('won');
            return true;
        }
        if (allies.getAlive().length === 0) {
            setPhase('lost');
            return true;
        }
        return false;
    };

    const resolveSkill = (skill: Skill, explicitTargets?: Character[]) => {
        if (!active) return;

        const enemyBefore = enemyTeam.getAll().map((c) => c.stats.hp);
        const allyBefore = allies.getAll().map((c) => c.stats.hp);

        engineRef.current!.executeSkill({
            skill,
            attacker: active,
            allies,
            enemies: enemyTeam,
            explicitTargets,
        });

        const dealt = enemyTeam.getAll().reduce((sum, c, i) => sum + (enemyBefore[i] - c.stats.hp), 0);
        const healed = allies.getAll().reduce((sum, c, i) => sum + (c.stats.hp - allyBefore[i]), 0);

        push(`${active.name} used ${skill.name}.`);
        if (dealt > 0) push(`Dealt ${Math.round(dealt)} damage.`, 'damage');
        if (healed > 0) push(`Healed ${Math.round(healed)} HP.`, 'heal');

        bump();
        if (checkEnd()) return;
        setPendingSkill(null);
        setPhase('enemy');
    };

    const enemyTurn = () => {
        const enemies = enemyTeam.getAlive();
        const targets = allies.getAlive();

        for (const enemy of enemies) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            const before = target.stats.hp;
            engineRef.current!.executeSkill({
                skill: makeAttackSkill(Math.round(enemy.getStat('attack'))),
                attacker: enemy,
                allies: enemyTeam,
                enemies: allies,
                explicitTargets: [target],
            });
            push(`${enemy.name} attacked ${target.name} for ${Math.round(before - target.stats.hp)}.`, 'damage');
        }

        bump();
        if (checkEnd()) return;
        setRound((r) => r + 1);
        setActiveIndex((i) => i + 1);
        setPhase('pick-skill');
    };

    useEffect(() => {
        if (phase === 'enemy') {
            const timer = window.setTimeout(enemyTurn, 650);
            return () => window.clearTimeout(timer);
        }
    }, [phase]);

    if (phase === 'won') {
        return (
            <div className="screen">
                <div className="card" style={{ textAlign: 'center', padding: 30 }}>
                    <div style={{ fontSize: 52 }}>🏆</div>
                    <h2 style={{ margin: '8px 0' }}>Victory!</h2>
                    <p className="empty" style={{ padding: 0 }}>The enemy has been defeated.</p>
                </div>
                <button className="btn btn--primary" onClick={() => api.finishCombat('won', { npc, placeId })}>
                    Continue
                </button>
            </div>
        );
    }

    if (phase === 'lost') {
        return (
            <div className="screen">
                <div className="card" style={{ textAlign: 'center', padding: 30 }}>
                    <div style={{ fontSize: 52 }}>💀</div>
                    <h2 style={{ margin: '8px 0' }}>Defeat</h2>
                    <p className="empty" style={{ padding: 0 }}>Your party has fallen.</p>
                </div>
                <button className="btn" onClick={() => api.finishCombat('lost', { placeId })}>
                    Wake up in Central Town
                </button>
            </div>
        );
    }

    if (phase === 'pick-target' && pendingSkill) {
        return (
            <div className="screen">
                <div className="section-title">Choose a target</div>
                {aliveEnemies.map((enemy) => (
                    <button key={enemy.id} className="menu-item" onClick={() => resolveSkill(pendingSkill, [enemy])}>
                        <span className="menu-icon">🎯</span>
                        <span className="menu-label">{enemy.name}</span>
                        <span className="menu-sub">
                            HP {Math.round(enemy.getStat('hp'))}/{Math.round(enemy.getStat('totalHp'))}
                        </span>
                    </button>
                ))}
                <button
                    className="btn"
                    onClick={() => {
                        setPendingSkill(null);
                        setPhase('pick-skill');
                    }}
                >
                    Cancel
                </button>
            </div>
        );
    }

    const skills: Skill[] = active
        ? [makeAttackSkill(Math.round(active.getStat('attack'))), ...active.skills]
        : [];

    return (
        <div className="screen">
            <div className="section-title">Round {round} · Enemies</div>
            {aliveEnemies.length === 0 ? (
                <div className="empty">No enemies remain.</div>
            ) : (
                aliveEnemies.map((enemy) => (
                    <div key={enemy.id} className="card" style={{ padding: 10 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{enemy.name}</div>
                        <StatBar label="HP" value={enemy.getStat('hp')} max={enemy.getStat('totalHp')} suffix={`/ ${Math.round(enemy.getStat('totalHp'))}`} />
                    </div>
                ))
            )}

            <div className="section-title">Your party</div>
            {aliveAllies.map((ally) => (
                <div
                    key={ally.id}
                    className="card"
                    style={{ padding: 10, borderColor: ally.id === active?.id ? 'var(--accent)' : undefined }}
                >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{ally.name}</div>
                    <StatBar label="HP" value={ally.getStat('hp')} max={ally.getStat('totalHp')} suffix={`/ ${Math.round(ally.getStat('totalHp'))}`} />
                </div>
            ))}

            <div className="log">
                {log.slice(-6).map((entry, index) => (
                    <div key={index} className={`entry ${entry.kind}`}>{entry.text}</div>
                ))}
            </div>

            <div className="section-title">{active ? `${active.name}'s turn` : 'Battle'}</div>
            <div className="btn-row">
                {skills.map((skill) => (
                    <button
                        key={skill.id}
                        className="btn"
                        onClick={() => {
                            if (skill.targeting === 'ENEMY') {
                                setPendingSkill(skill);
                                setPhase('pick-target');
                            } else {
                                resolveSkill(skill);
                            }
                        }}
                    >
                        {skill.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
