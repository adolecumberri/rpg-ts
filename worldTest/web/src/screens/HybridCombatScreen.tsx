import { useEffect, useReducer, useRef, useState } from 'react';
import type { Character } from '@rpg';
import {
    FATIGUE,
    FIGHTS,
    buildHybridCombat,
    columnsFor,
    intervalFromSpeed,
    specOf,
    statusTooltip,
} from '@core';
import type { CombatEndResult, HybridEvent, HybridManualEvent, HybridSetup } from '@core';
import { useGame } from '../game/GameContext';

// Time between two revealed events (auto attacks) in ms.
const STEP_MS = 650;

type Phase = 'fighting' | 'won' | 'lost' | 'fled';

function iconOf(character: Character): string {
    if (character.id === 'player') return '🧑‍🌾';
    if (character.id.indexOf('goblin') !== -1 || character.name === 'Goblin') return '👺';
    return '🌾';
}

function StatusChips({ character }: { character: Character }) {
    const api = useGame();
    const statuses = Array.from(character.statusManager.statuses.values());
    if (statuses.length === 0) return null;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {statuses.map((status) => {
                const hint = statusTooltip(status.definition);
                return (
                    <span
                        key={status.id}
                        className="tag"
                        title={hint}
                        onClick={() => api.showToast(hint, 3500)}
                    >
                        {status.definition.name}
                        {status.definition.duration.type === 'TEMPORAL'
                            ? ` ${status.definition.duration.value ?? 0}t`
                            : ''}
                    </span>
                );
            })}
        </div>
    );
}

function CombatantSquare({
    character,
    interval,
    flash,
    dead,
}: {
    character: Character;
    interval: number;
    flash: boolean;
    dead: boolean;
}) {
    const classes = ['combatant-square'];
    if (dead) classes.push('dead');
    if (flash) classes.push('active');
    const hp = character.stats.hp;
    const maxHp = character.stats.totalHp;
    const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
    return (
        <div className={classes.join(' ')}>
            <div className="portrait"><span>{dead ? '💀' : iconOf(character)}</span></div>
            <div className="name">{character.name}</div>
            <div className="stats">
                ⚔️ {Math.round(character.getStat('attack'))} · 🛡️ {Math.round(character.getStat('defence'))}
            </div>
            <div className="hp-row">
                <div className="bar">
                    <div className="bar-fill hp" style={{ width: `${pct}%` }} />
                </div>
                <span className="hp-text">{Math.round(hp)}/{Math.round(maxHp)}</span>
            </div>
            <div className="interval tag">⏱️ {interval}</div>
            {FATIGUE.enabled ? (
                <div className="stats">😵 {Math.round(character.getStat('fatigue'))} ftg</div>
            ) : null}
            <StatusChips character={character} />
        </div>
    );
}

export function HybridCombatScreen({
    fightId,
    placeId,
    missionId,
}: {
    fightId?: string;
    placeId: string;
    missionId?: string;
}) {
    const api = useGame();
    const fight = fightId ? FIGHTS[fightId] : undefined;

    const [setup] = useState<HybridSetup | null>(() =>
        fight ? buildHybridCombat(api.session, fight) : null,
    );
    const combat = setup?.combat ?? null;

    const [events, setEvents] = useState<HybridEvent[]>([]);
    const [manual, setManual] = useState<HybridManualEvent | null>(null);
    const [phase, setPhase] = useState<Phase>('fighting');
    const [outcome, setOutcome] = useState<CombatEndResult | null>(null);
    const settled = useRef(false);
    const lastHitBy = useRef(new Map<string, string>());
    const timer = useRef<number | undefined>(undefined);
    const [, bump] = useReducer((x: number) => x + 1, 0);

    const applyAuto = (event: Extract<HybridEvent, { kind: 'auto' }>) => {
        if (event.kills && event.kills.length > 0) {
            for (const kill of event.kills) {
                lastHitBy.current.set(kill.targetId, kill.killerId);
            }
        } else if (!event.targetAlive) {
            lastHitBy.current.set(event.targetId, event.actorId);
        }
        setEvents((prev) => [...prev, event]);
        bump();
    };

    // Step the engine: automatic events resolve on their own; a manual
    // prompt pauses the loop until the player picks a target.
    useEffect(() => {
        if (!combat || phase !== 'fighting' || manual) return;
        timer.current = window.setTimeout(() => {
            const event = combat.next();
            if (event.kind === 'end') {
                setEvents((prev) => [...prev, event]);
                setPhase(event.winner === 'left' ? 'won' : event.winner === 'right' ? 'lost' : 'lost');
                return;
            }
            if (event.kind === 'manual') {
                setManual(event);
                return;
            }
            applyAuto(event);
        }, STEP_MS);
        return () => {
            if (timer.current) window.clearTimeout(timer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, manual, events]);

    const pickTarget = (targetId: string) => {
        if (!combat || !manual) return;
        const event = combat.resolveManual(targetId);
        setManual(null);
        if (event) applyAuto(event);
    };

    const castSkill = (skillId: string) => {
        if (!combat || !manual) return;
        const event = combat.resolveManualSkill(skillId);
        setManual(null);
        if (event) applyAuto(event);
    };

    // Settle the battle exactly once: grants XP/gold, runs the fight's
    // outcome hooks (mission), and clears statuses.
    useEffect(() => {
        if ((phase === 'won' || phase === 'lost' || phase === 'fled') && !settled.current && setup) {
            settled.current = true;
            for (const character of [...setup.allies, ...setup.enemies]) {
                character.statusManager.removeAllStatuses();
            }
            const kills = setup.enemies
                .filter((enemy) => enemy.stats.hp <= 0)
                .map((enemy) => ({ enemyId: enemy.id, killerId: lastHitBy.current.get(enemy.id) ?? '' }));
            // Roster farmers beyond the active party: they keep their
            // damage and earn XP (persisted with the save).
            const fighters = setup.allies.filter((ally) => !api.team.getCharacter(ally.id));
            const result = api.session.finishCombat(phase, { placeId, kills, fighters, participants: setup.allies, fightId, missionId });
            setOutcome(result);
            api.refresh();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    // Leaving mid-battle without settling: clear statuses on everyone.
    useEffect(() => {
        return () => {
            if (!settled.current && setup) {
                for (const character of [...setup.allies, ...setup.enemies]) {
                    character.statusManager.removeAllStatuses();
                }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!setup || !fight) return null;

    const flashIds = new Set<string>();
    const last = events[events.length - 1];
    if (last && last.kind === 'auto') {
        flashIds.add(last.actorId);
        for (const id of last.targetIds ?? [last.targetId]) flashIds.add(id);
    }

    const gridClasses = (count: number): string => `battle-grid cols-${columnsFor(count)}`;

    if (phase === 'won') {
        return (
            <div className="screen">
                <div className="card" style={{ textAlign: 'center', padding: 30 }}>
                    <div style={{ fontSize: 52 }}>🏆</div>
                    <h2 style={{ margin: '8px 0' }}>Victory!</h2>
                    <p className="empty" style={{ padding: 0 }}>The goblins have been driven off.</p>
                </div>
                <button
                    className="btn btn--primary"
                    onClick={() => {
                        if (outcome) api.showToast(outcome.message);
                        api.openPlace();
                    }}
                >
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
                <button
                    className="btn btn--primary"
                    onClick={() => {
                        if (outcome) api.showToast(outcome.message);
                        api.openPlace();
                    }}
                >
                    Wake up at the farm
                </button>
            </div>
        );
    }

    if (phase === 'fled') {
        return (
            <div className="screen">
                <div className="card" style={{ textAlign: 'center', padding: 30 }}>
                    <div style={{ fontSize: 52 }}>🏃</div>
                    <h2 style={{ margin: '8px 0' }}>You fled</h2>
                    <p className="empty" style={{ padding: 0 }}>{outcome?.message ?? 'You ran from the battle.'}</p>
                </div>
                <button
                    className="btn btn--primary"
                    onClick={() => {
                        if (outcome) api.showToast(outcome.message);
                        api.openPlace();
                    }}
                >
                    Continue
                </button>
            </div>
        );
    }

    const manualActor = manual ? setup.allies.find((ally) => ally.id === manual.actorId) : undefined;

    return (
        <div className="screen">
            <div className="card" style={{ padding: 12 }}>
                <div className="section-title">Your side</div>
                <div className={gridClasses(setup.allies.length)}>
                    {setup.allies.map((ally) => (
                        <CombatantSquare
                            key={ally.id}
                            character={ally}
                            interval={intervalFromSpeed(ally.getStat('speed'))}
                            flash={flashIds.has(ally.id)}
                            dead={ally.stats.hp <= 0}
                        />
                    ))}
                </div>
                <div className="section-title" style={{ marginTop: 12 }}>Goblins</div>
                <div className={gridClasses(setup.enemies.length)}>
                    {setup.enemies.map((enemy) => (
                        <CombatantSquare
                            key={enemy.id}
                            character={enemy}
                            interval={intervalFromSpeed(enemy.getStat('speed'))}
                            flash={flashIds.has(enemy.id)}
                            dead={enemy.stats.hp <= 0}
                        />
                    ))}
                </div>
            </div>

            <div className="log">
                {events.slice(-9).map((event, index) => {
                    if (event.kind === 'end') {
                        return <div key={index} className="entry info">Battle ended at tick {event.ticks}.</div>;
                    }
                    if (event.kind === 'manual') {
                        return <div key={index} className="entry info">[tick {event.tick}] {manualActor?.name ?? event.actorId} is choosing a target…</div>;
                    }
                    const nameOf = (id: string) =>
                        setup.allies.find((c) => c.id === id)?.name
                        ?? setup.enemies.find((c) => c.id === id)?.name
                        ?? id;
                    if (event.skillId) {
                        const targets = (event.targetIds ?? [event.targetId]).map(nameOf).join(', ');
                        const dead = event.kills && event.kills.length > 0 ? ' 💀' : '';
                        return (
                            <div key={index} className={`entry ${event.damage > 0 ? 'damage' : 'heal'}`}>
                                [tick {event.tick}] {nameOf(event.actorId)} used {event.note ?? event.skillId} on {targets}: {Math.round(event.damage)} dmg
                                {event.heal ? ` · ${Math.round(event.heal)} heal` : ''}{dead}
                            </div>
                        );
                    }
                    return (
                        <div key={index} className={`entry ${event.damage > 0 ? 'damage' : 'info'}`}>
                            [tick {event.tick}] {nameOf(event.actorId)} → {nameOf(event.targetId)} for {Math.round(event.damage)}
                            {event.note ? ` (${event.note})` : ''}
                            {' '}({nameOf(event.targetId)} HP {Math.round(event.targetHpAfter)})
                            {!event.targetAlive ? ' 💀' : ''}
                        </div>
                    );
                })}
            </div>

            {manual ? (
                <div className="section-title">🎯 {manualActor?.name ?? 'You'}: choose an action</div>
            ) : (
                <div className="section-title">Battle continues…</div>
            )}

            {manual ? (
                <>
                    {(manual.skills ?? []).map((skillId) => {
                        const spec = specOf(skillId);
                        if (!spec) return null;
                        return (
                            <button key={skillId} className="menu-item" onClick={() => castSkill(skillId)}>
                                <span className="menu-icon">✨</span>
                                <span className="menu-label">{spec.name}</span>
                                <span className="menu-sub">{spec.description}</span>
                            </button>
                        );
                    })}
                    {setup.enemies
                        .filter((enemy) => enemy.stats.hp > 0 && manual.targets.includes(enemy.id))
                        .map((enemy) => (
                            <button key={enemy.id} className="menu-item" onClick={() => pickTarget(enemy.id)}>
                                <span className="menu-icon">⚔️</span>
                                <span className="menu-label">Attack {enemy.name}</span>
                                <span className="menu-sub">
                                    HP {Math.round(enemy.stats.hp)}/{Math.round(enemy.stats.totalHp)}
                                </span>
                            </button>
                        ))}
                </>
            ) : null}

            <div className="btn-row">
                <button className="btn btn--danger" onClick={() => setPhase('fled')}>🏃 Run</button>
            </div>
        </div>
    );
}
