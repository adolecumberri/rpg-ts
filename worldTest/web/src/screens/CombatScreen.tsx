import { useEffect, useReducer, useRef, useState } from 'react';
import { Team } from '@rpg';
import type { Character } from '@rpg';
import { StatusInstance } from '@rpg/classes/StatusInstance';
import type { EventMoment } from '@rpg/types/generalEvents.types';
import {
    DamageComposer,
    DEFAULT_ELEMENTS,
    affinitiesOf,
    attackComponentsOf,
    compareBySpeed,
    defenceLayersOf,
    intervalFromSpeed,
    kindMultiplierFor,
    kindOfElement,
    makeGroupTeam,
    resolveGeneralAttack,
    specOf,
} from '@core';
import type { CombatEndResult, DamageResult, SkillSpec } from '@core';
import { useGame } from '../game/GameContext';
import { StatBar } from '../components/StatBar';
import { TOAST_MS } from '../constants/toast';

type Phase = 'action' | 'pick-target' | 'pick-targets' | 'resolve' | 'won' | 'lost';
type LogEntry = { text: string; kind: 'info' | 'damage' | 'heal' };
type Pending =
    | { kind: 'attack' }
    | { kind: 'skill'; spec: SkillSpec; maxTargets: number };

// An action locked in during the pick phase, executed in the resolve
// phase ordered by speed (skills can carry a priority later).
type PickedAction =
    | { actor: Character; kind: 'attack'; targets: Character[] }
    | { actor: Character; kind: 'skill'; spec: SkillSpec; targets: Character[] }
    | { actor: Character; kind: 'wait' };

function StatusChips({ character }: { character: Character }) {
    const statuses = Array.from(character.statusManager.statuses.values());
    if (statuses.length === 0) return null;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {statuses.map((status) => (
                <span key={status.id} className="tag">
                    {status.definition.name}
                    {status.definition.duration.type === 'TEMPORAL'
                        ? ` ${status.definition.duration.value ?? 0}t`
                        : ''}
                </span>
            ))}
        </div>
    );
}

function ElementalChips({ character }: { character: Character }) {
    const api = useGame();
    const parts: { key: string; icon: string; text: string; hint: string }[] = [];

    const attack = new Map<string, number>();
    for (const component of attackComponentsOf(character)) {
        if (component.element === 'physical') continue;
        attack.set(component.element, (attack.get(component.element) ?? 0) + component.amount);
    }
    for (const [element, amount] of attack) {
        const name = DEFAULT_ELEMENTS.get(element)?.name ?? element;
        const kind = kindOfElement(element);
        const hintText = kind === 'true'
            ? `${name} +${Math.round(amount)}: true damage, ignores defence, resistances and affinities.`
            : `${name} +${Math.round(amount)}: ${kind} bonus damage.`;
        parts.push({ key: `atk-${element}`, icon: DEFAULT_ELEMENTS.get(element)?.icon ?? '✨', text: `+${Math.round(amount)}`, hint: hintText });
    }

    for (const [element, multiplier] of Object.entries(affinitiesOf(character.id))) {
        const name = DEFAULT_ELEMENTS.get(element)?.name ?? element;
        const hint = multiplier > 1
            ? `${name} affinity ×${multiplier}: takes ${multiplier}× ${name.toLowerCase()} damage (weak).`
            : `${name} affinity ×${multiplier}: takes ${multiplier}× ${name.toLowerCase()} damage (resistant).`;
        parts.push({ key: `aff-${element}`, icon: DEFAULT_ELEMENTS.get(element)?.icon ?? '✨', text: `×${multiplier}`, hint });
    }

    if (parts.length === 0) return null;
    return (
        <span style={{ marginLeft: 6, display: 'inline-flex', gap: 4 }}>
            {parts.map((part) => (
                <span
                    key={part.key}
                    className="tag"
                    style={{ fontSize: 10, padding: '1px 6px' }}
                    title={part.hint}
                    onClick={() => api.showToast(part.hint, TOAST_MS.help)}
                >
                    {part.icon} {part.text}
                </span>
            ))}
        </span>
    );
}

export function CombatScreen({
    npcId,
    placeId,
    group,
    groupId,
}: {
    npcId?: string;
    placeId: string;
    group?: boolean;
    groupId?: string;
}) {
    const api = useGame();
    const npc = npcId ? api.findNpc(npcId) : undefined;

    const [enemyTeam] = useState<Team>(() => {
        if (group) return makeGroupTeam(groupId);
        return new Team({ id: 'enemy', members: npc ? [npc.character] : [] });
    });

    const allies = api.team;

    const [phase, setPhase] = useState<Phase>('action');
    const [round, setRound] = useState(1);
    const [allyQueue, setAllyQueue] = useState<string[]>([]);
    const [picked, setPicked] = useState<PickedAction[]>([]);
    const [order, setOrder] = useState<PickedAction[]>([]);
    const [resolveIndex, setResolveIndex] = useState(0);
    const [pending, setPending] = useState<Pending | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [log, setLog] = useState<LogEntry[]>([{ text: 'The battle begins!', kind: 'info' }]);
    const [, bump] = useReducer((x: number) => x + 1, 0);

    const aliveAllies = allies.getAlive();
    const aliveEnemies = enemyTeam.getAlive();
    const active = (() => {
        const id = allyQueue[0];
        const found = id ? allies.getCharacter(id) : undefined;
        return found ?? aliveAllies[0];
    })();

    const push = (text: string, kind: LogEntry['kind'] = 'info') =>
        setLog((prev) => [...prev, { text, kind }]);

    const pushBreakdown = (result: DamageResult) => {
        for (const line of result.breakdown) {
            const multiplier = Math.round(line.multiplier * 100) / 100;
            push(
                `  ${line.label} (${line.element}${line.crit ? ', crit' : ''}): ${Math.round(line.damage)} × ${multiplier} − ${Math.round(line.reducedBy)} = ${Math.round(line.final)}`,
                'info',
            );
        }
    };

    const performAttack = (attacker: Character, defender: Character) => {
        const outcome = resolveGeneralAttack(attacker, defender, Math.random, { breakdown: showBreakdown });
        defender.stats.hp = Math.max(0, defender.stats.hp - outcome.damage);
        defender.stats.isAlive = defender.stats.hp > 0 ? 1 : 0;
        lastHitBy.current.set(defender.id, attacker.id);
        push(
            `${attacker.name} attacked ${defender.name} for ${Math.round(outcome.damage)}${outcome.note ? ` (${outcome.note})` : ''}.`,
            'damage',
        );
        if (showBreakdown && outcome.breakdown) pushBreakdown({ total: outcome.damage, breakdown: outcome.breakdown });
    };

    const triggerAll = (moment: EventMoment) => {
        for (const character of [...allies.getAll(), ...enemyTeam.getAll()]) {
            const hpBefore = character.stats.hp;
            character.statusManager.trigger(moment);

            // DOT/HOT ticks happen at the end of each round: log them.
            if (moment === 'after_turn') {
                const delta = character.stats.hp - hpBefore;
                if (delta > 0) {
                    push(`${character.name} recovers ${Math.round(delta)} HP from statuses.`, 'heal');
                } else if (delta < 0) {
                    push(`${character.name} takes ${Math.round(-delta)} status damage.`, 'damage');
                }
            }
        }
    };

    // Triggers statuses at the end of a character's own action (e.g., Regeneration).
    const triggerTurnEnd = (character: Character) => {
        const hpBefore = character.stats.hp;
        character.statusManager.trigger('turn_end');
        const delta = character.stats.hp - hpBefore;
        if (delta > 0) {
            push(`${character.name} regenerates +${Math.round(delta)} HP.`, 'heal');
        } else if (delta < 0) {
            push(`${character.name} takes ${Math.round(-delta)} status damage.`, 'damage');
        }
    };

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

    const beginRound = () => {
        triggerAll('before_turn');
        setAllyQueue(allies.getAlive().map((ally) => ally.id));
        setPicked([]);
        setPhase('action');
        bump();
    };

    const targetsFor = (spec: SkillSpec, explicit?: Character[]): Character[] => {
        switch (spec.targeting) {
            case 'SELF':
                return active ? [active] : [];
            case 'ENEMY':
                return explicit ?? [];
            case 'ALL_ENEMIES':
                return aliveEnemies;
            case 'ALL_ALLIES':
                return aliveAllies;
            default:
                return [];
        }
    };

    const sortOrder = (a: PickedAction, b: PickedAction): number => {
        // Skill priority (0 by default) goes above speed; the priority
        // values themselves are not defined yet.
        const priorityOf = (action: PickedAction) => action.kind === 'skill' ? action.spec.priority ?? 0 : 0;
        return priorityOf(b) - priorityOf(a) || compareBySpeed(a.actor, b.actor);
    };

    const startResolve = (finalPicked: PickedAction[]) => {
        const enemyPicks: PickedAction[] = enemyTeam.getAlive().map((enemy) => {
            const targets = allies.getAlive();
            const target = targets[Math.floor(Math.random() * targets.length)];
            return { actor: enemy, kind: 'attack' as const, targets: [target] };
        });
        setOrder([...finalPicked, ...enemyPicks].sort(sortOrder));
        setResolveIndex(0);
        setPhase('resolve');
    };

    // Executes one locked action. Pure execution: no turn advancement.
    const applyAction = (action: PickedAction) => {
        const actor = action.actor;

        if (actor.stats.hp <= 0) {
            push(`${actor.name} is down and cannot act.`);
            return;
        }

        if (action.kind === 'wait') {
            push(`${actor.name} waits.`);
        } else if (action.kind === 'attack') {
            const target = action.targets[0];
            if (!target || target.stats.hp <= 0) {
                push(`${actor.name}'s target is already down.`);
            } else {
                performAttack(actor, target);
            }
        } else {
            const spec = action.spec;
            const targets = action.targets.filter((target) => target.stats.hp > 0);

            if (spec.damage) {
                for (const target of targets) {
                    const components = spec.damage.map((component) => ({
                        ...component,
                        kind: component.kind ?? kindOfElement(component.element),
                    }));
                    const result = DamageComposer.resolveKinds(
                        components,
                        defenceLayersOf(target),
                        kindMultiplierFor(target),
                        { breakdown: showBreakdown },
                    );
                    target.stats.hp = Math.max(0, target.stats.hp - result.total);
                    target.stats.isAlive = target.stats.hp > 0 ? 1 : 0;
                    lastHitBy.current.set(target.id, actor.id);
                    push(`${actor.name} used ${spec.name} on ${target.name}: ${Math.round(result.total)} damage.`, 'damage');
                    if (showBreakdown) pushBreakdown(result);
                }
            }

            if (spec.heal) {
                for (const target of targets) {
                    if (target.stats.hp <= 0) continue;
                    target.stats.hp = Math.min(target.stats.totalHp, target.stats.hp + spec.heal);
                }
                push(`${actor.name} used ${spec.name}: healed ${spec.heal} HP each.`, 'heal');
            }

            if (spec.statusOnTargets) {
                for (const target of targets) {
                    target.statusManager.addStatusInstance(new StatusInstance({ definition: spec.statusOnTargets }));
                }
            }
            if (spec.statusOnSelf) {
                actor.statusManager.addStatusInstance(new StatusInstance({ definition: spec.statusOnSelf }));
            }
        }

        triggerTurnEnd(actor);
    };

    // Resolve the locked actions one by one, in speed order. The battle
    // ends the moment a side is wiped: later actions never happen.
    useEffect(() => {
        if (phase !== 'resolve') return;

        if (resolveIndex >= order.length) {
            triggerAll('after_turn');
            bump();
            if (checkEnd()) return;
            setRound((r) => r + 1);
            beginRound();
            return;
        }

        const timer = window.setTimeout(() => {
            const action = order[resolveIndex];
            applyAction(action);

            const enemiesLeft = enemyTeam.getAlive().length;
            const alliesLeft = allies.getAlive().length;
            if (enemiesLeft === 0 || alliesLeft === 0) {
                setPhase(enemiesLeft === 0 ? 'won' : 'lost');
                return;
            }

            setResolveIndex((index) => index + 1);
            bump();
        }, 550);

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, resolveIndex, order]);

    useEffect(() => {
        beginRound();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [outcome, setOutcome] = useState<CombatEndResult | null>(null);
    const settled = useRef(false);
    const lastHitBy = useRef(new Map<string, string>());

    // Settle the battle exactly once: grants XP/gold/loot and clears statuses.
    useEffect(() => {
        if ((phase === 'won' || phase === 'lost') && !settled.current) {
            settled.current = true;
            for (const character of [...allies.getAll(), ...enemyTeam.getAll()]) {
                character.statusManager.removeAllStatuses();
            }
            const kills = enemyTeam.getAll()
                .filter((enemy) => enemy.stats.hp <= 0)
                .map((enemy) => ({ enemyId: enemy.id, killerId: lastHitBy.current.get(enemy.id) ?? '' }));
            const result = api.session.finishCombat(phase, { npc, placeId, kills });
            setOutcome(result);
            api.refresh();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    // Flee cleanup: when the battle ends without settling (user went back),
    // restore the enemies and clear statuses on both sides.
    useEffect(() => {
        return () => {
            if (!settled.current) {
                for (const character of [...allies.getAll(), ...enemyTeam.getAll()]) {
                    character.statusManager.removeAllStatuses();
                }
                for (const enemy of enemyTeam.getAll()) {
                    enemy.stats.hp = enemy.stats.totalHp;
                    enemy.stats.isAlive = 1;
                }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ------------------------------------------------------------------
    // Picking helpers
    // ------------------------------------------------------------------
    const advancePicking = (nextPicked: PickedAction[]) => {
        setPending(null);
        setSelectedIds([]);
        setPhase('action');
        const next = allyQueue.slice(1);
        if (next.length === 0) {
            setAllyQueue([]);
            bump();
            startResolve(nextPicked);
            return;
        }
        setAllyQueue(next);
        bump();
    };

    const commitPick = (action: PickedAction) => {
        // Build the final list synchronously: the last ally's pick must
        // reach the resolve phase, so it cannot read stale state.
        const nextPicked = [...picked, action];
        setPicked(nextPicked);
        advancePicking(nextPicked);
    };

    const startSkill = (spec: SkillSpec) => {
        if (!active) return;
        if (spec.targeting === 'ENEMY') {
            const max = spec.numberOfTargets ?? 1;
            setPending({ kind: 'skill', spec, maxTargets: max });
            if (max > 1) {
                setSelectedIds([]);
                setPhase('pick-targets');
            } else {
                setPhase('pick-target');
            }
        } else {
            // SELF / ALL_ENEMIES / ALL_ALLIES need no explicit target.
            commitPick({ actor: active, kind: 'skill', spec, targets: targetsFor(spec) });
        }
    };

    const executePending = (ids: string[]) => {
        if (!pending || !active) return;
        const targets = aliveEnemies.filter((enemy) => ids.includes(enemy.id));
        if (targets.length === 0) return;

        if (pending.kind === 'attack') {
            commitPick({ actor: active, kind: 'attack', targets: [targets[0]] });
            return;
        }

        commitPick({ actor: active, kind: 'skill', spec: pending.spec, targets });
    };

    const toggleTarget = (id: string, max: number) => {
        setSelectedIds((ids) => {
            if (ids.includes(id)) return ids.filter((x) => x !== id);
            if (ids.length >= max) return ids;
            return [...ids, id];
        });
    };

    // ------------------------------------------------------------------
    // Screens
    // ------------------------------------------------------------------
    if (phase === 'won') {
        return (
            <div className="screen">
                <div className="card" style={{ textAlign: 'center', padding: 30 }}>
                    <div style={{ fontSize: 52 }}>🏆</div>
                    <h2 style={{ margin: '8px 0' }}>Victory!</h2>
                    <p className="empty" style={{ padding: 0 }}>The enemy has been defeated.</p>
                </div>
                {outcome && outcome.specialSpawn ? (
                    <div className="card" style={{ textAlign: 'center', borderColor: 'rgba(245, 185, 66, 0.6)' }}>
                        ⚠️ A special encounter appeared: <strong>{outcome.specialSpawn.name}</strong>
                    </div>
                ) : null}
                {outcome && outcome.drops.length > 0 ? (
                    <div className="card">
                        <div className="section-title">Loot</div>
                        {outcome.drops.map((drop) => (
                            <div key={drop.itemId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                <span>{api.session.itemTable.get(drop.itemId)?.name ?? drop.itemId}</span>
                                <span className="tag gold">x{drop.quantity}</span>
                            </div>
                        ))}
                    </div>
                ) : null}
                <button
                    className="btn btn--primary"
                    onClick={() => {
                        if (outcome) api.showToast(outcome.message);
                        api.back();
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
                    className="btn"
                    onClick={() => {
                        if (outcome) api.showToast(outcome.message);
                        api.back();
                    }}
                >
                    Wake up in Central Town
                </button>
            </div>
        );
    }

    if (phase === 'pick-target' && pending) {
        const header = pending.kind === 'skill' ? pending.spec.name : 'Attack';
        return (
            <div className="screen">
                <div className="section-title">{header} · choose a target</div>
                {aliveEnemies.map((enemy) => (
                    <button key={enemy.id} className="menu-item" onClick={() => executePending([enemy.id])}>
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
                        setPending(null);
                        setPhase('action');
                    }}
                >
                    Cancel
                </button>
            </div>
        );
    }

    if (phase === 'pick-targets' && pending && pending.kind === 'skill') {
        const max = pending.maxTargets;
        return (
            <div className="screen">
                <div className="section-title">
                    {pending.spec.name} · select up to {max} targets ({selectedIds.length} selected)
                </div>
                {aliveEnemies.map((enemy) => {
                    const selected = selectedIds.includes(enemy.id);
                    return (
                        <button key={enemy.id} className="menu-item" onClick={() => toggleTarget(enemy.id, max)}>
                            <span className="menu-icon">{selected ? '✅' : '🎯'}</span>
                            <span className="menu-label">{enemy.name}</span>
                            <span className="menu-sub">
                                HP {Math.round(enemy.getStat('hp'))}/{Math.round(enemy.getStat('totalHp'))}
                            </span>
                        </button>
                    );
                })}
                <div className="btn-row">
                    <button
                        className="btn btn--primary"
                        disabled={selectedIds.length === 0}
                        onClick={() => executePending(selectedIds)}
                    >
                        Execute ({selectedIds.length})
                    </button>
                    <button
                        className="btn"
                        onClick={() => {
                            setPending(null);
                            setSelectedIds([]);
                            setPhase('action');
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    const pickedIds = new Set(picked.map((action) => action.actor.id));
    const skillSpecs: SkillSpec[] = active
        ? (api.session.availableSkillIds(active)
            .map((id) => specOf(id))
            .filter((spec): spec is SkillSpec => Boolean(spec)))
        : [];

    const specHint = (spec: SkillSpec): string => {
        const parts: string[] = [];
        if (spec.damage) {
            const total = spec.damage.reduce((sum, component) => sum + component.amount, 0);
            parts.push(`⚔️ ${Math.round(total)}`);
        }
        if (spec.heal) parts.push(`💚 ${spec.heal}`);
        if (spec.statusOnTargets) parts.push(spec.statusOnTargets.name);
        if (spec.statusOnSelf) parts.push(spec.statusOnSelf.name);
        return parts.join(' · ');
    };

    const headerTitle = phase === 'resolve' ? 'Resolving round…' : active ? `${active.name}'s pick` : 'Battle';

    const speedHint = (character: Character): string => {
        const speed = Math.round(character.getStat('speed'));
        return `Speed ${speed}: acts earlier in the round; in the interval battle, acts every ${intervalFromSpeed(speed)} ticks.`;
    };

    const speedTag = (character: Character) => (
        <span
            className="tag"
            style={{ marginLeft: 6 }}
            title={speedHint(character)}
            onClick={() => api.showToast(speedHint(character), TOAST_MS.help)}
        >
            ⚡ {Math.round(character.getStat('speed'))}
        </span>
    );

    return (
        <div className="screen">
            <div className="section-title">Round {round} · Enemies</div>
            {aliveEnemies.length === 0 ? (
                <div className="empty">No enemies remain.</div>
            ) : (
                aliveEnemies.map((enemy) => (
                    <div key={enemy.id} className="card" style={{ padding: 10 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                            {enemy.name}
                            <ElementalChips character={enemy} />
                            {speedTag(enemy)}
                        </div>
                        <StatBar label="HP" value={enemy.getStat('hp')} max={enemy.getStat('totalHp')} suffix={`/ ${Math.round(enemy.getStat('totalHp'))}`} />
                        <StatusChips character={enemy} />
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
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {ally.name}
                        <ElementalChips character={ally} />
                        {speedTag(ally)}
                        {pickedIds.has(ally.id) ? <span className="tag" style={{ marginLeft: 6 }}>✓ picked</span> : null}
                    </div>
                    <StatBar label="HP" value={ally.getStat('hp')} max={ally.getStat('totalHp')} suffix={`/ ${Math.round(ally.getStat('totalHp'))}`} />
                    <StatusChips character={ally} />
                </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="section-title" style={{ margin: 0 }}>Battle Log</div>
                <button
                    className="btn"
                    style={{ padding: '6px 10px', fontSize: 12, minWidth: 0, flex: 'none' }}
                    onClick={() => setShowBreakdown((v) => !v)}
                >
                    🧮 Breakdown: {showBreakdown ? 'ON' : 'OFF'}
                </button>
            </div>
            <div className="log">
                {log.slice(-8).map((entry, index) => (
                    <div key={index} className={`entry ${entry.kind}`}>{entry.text}</div>
                ))}
            </div>

            <div className="section-title">{headerTitle}</div>
            {phase === 'action' && active ? (
                <div className="btn-row">
                    <button
                        className="btn"
                        onClick={() => {
                            setPending({ kind: 'attack' });
                            setPhase('pick-target');
                        }}
                    >
                        ⚔️ Attack
                    </button>
                    {skillSpecs.map((spec) => (
                        <button key={spec.id} className="btn" onClick={() => startSkill(spec)}>
                            <span style={{ display: 'block' }}>{spec.name}</span>
                            <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>
                                {specHint(spec)}
                            </span>
                        </button>
                    ))}
                    <button className="btn" onClick={() => commitPick({ actor: active, kind: 'wait' })}>⏳ Wait</button>
                </div>
            ) : null}
        </div>
    );
}
