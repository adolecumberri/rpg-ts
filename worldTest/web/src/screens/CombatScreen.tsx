import { useEffect, useReducer, useRef, useState } from 'react';
import { Team } from '@rpg';
import type { Character } from '@rpg';
import type { EventMoment } from '@rpg/types/generalEvents.types';
import {
    DEFAULT_ELEMENTS,
    FATIGUE,
    FIGHTS,
    affinitiesOf,
    attackComponentsOf,
    battleSkillSpecs,
    clearStatuses,
    columnsFor,
    compareBySpeed,
    consumeFaintTurn,
    effectiveRangeOf,
    gainFatigue,
    intervalFromSpeed,
    kindOfElement,
    pickWeightedTarget,
    rampGatePower,
    reachableTargets,
    resolveGeneralAttack,
    resolveSkillEffect,
    ROWS,
    rowEntriesOf,
    specOf,
    statusTooltip,
    syncAuras,
} from '@core';
import type { CombatEndResult, DamageResult, RowEntry, RowPosition, SkillSpec } from '@core';
import { useGame } from '../game/GameContext';
import { TOAST_MS } from '../constants/toast';

type Phase = 'action' | 'pick-target' | 'pick-targets' | 'resolve' | 'won' | 'lost' | 'fled';
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

const ROW_LABELS: Record<RowPosition, string> = {
    front: '🛡️ Front',
    center: '⚔️ Center',
    back: '🏹 Back',
};

function iconOf(character: Character): string {
    if (character.id === 'player') return '🧑‍🌾';
    if (character.id.indexOf('goblin') !== -1 || character.name === 'Goblin') return '👺';
    return '🌾';
}

/**
 * A compact fighter cell (like the hybrid battle squares): portrait,
 * name, reach/speed, hp bar and statuses. Several fit per row.
 */
function CombatantSquare({
    character,
    active,
    picked,
    outOfReach,
    onClick,
}: {
    character: Character;
    active?: boolean;
    picked?: boolean;
    outOfReach?: boolean;
    onClick?: () => void;
}) {
    const classes = ['combatant-square'];
    if (active) classes.push('active');
    if (outOfReach) classes.push('dead');
    const hp = character.getStat('hp');
    const maxHp = character.getStat('totalHp');
    const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
    return (
        <div
            className={classes.join(' ')}
            style={onClick && !outOfReach ? { cursor: 'pointer' } : undefined}
            onClick={onClick}
        >
            <div className="portrait"><span>{iconOf(character)}</span></div>
            <div className="name">{character.name}{picked ? ' ✓' : ''}</div>
            <div className="stats">
                🎯 {effectiveRangeOf(character)} · ⚡ {Math.round(character.getStat('speed'))}
            </div>
            <div className="hp-row">
                <div className="bar">
                    <div className="bar-fill hp" style={{ width: `${pct}%` }} />
                </div>
                <span className="hp-text">{Math.round(hp)}/{Math.round(maxHp)}</span>
            </div>
            <StatusChips character={character} />
        </div>
    );
}

function StatusChips({ character }: { character: Character }) {
    const api = useGame();
    const statuses = Array.from(character.statusManager.statuses.values());
    if (statuses.length === 0) return null;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {statuses.map((status) => {
                const hint = statusTooltip(status.definition);
                return (
                    <span
                        key={status.id}
                        className="tag"
                        title={hint}
                        onClick={() => api.showToast(hint, TOAST_MS.help)}
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

export function CombatScreen({
    npcId,
    placeId,
    fightId,
    missionId,
}: {
    npcId?: string;
    placeId: string;
    fightId?: string;
    missionId?: string;
}) {
    const api = useGame();
    const npc = npcId ? api.findNpc(npcId) : undefined;
    const fight = fightId ? FIGHTS[fightId] : undefined;

    const [enemyTeam] = useState<Team>(() => {
        if (fight) {
            return new Team({ id: fight.id, members: fight.enemies() });
        }
        return new Team({ id: 'enemy', members: npc ? [npc.character] : [] });
    });

    const [allyTeam] = useState<Team>(() => {
        if (fight) {
            // The player's party plus the fight's extra allies.
            return new Team({ id: 'party', members: [...api.team.getAll(), ...(fight.allies?.() ?? [])] });
        }
        return api.team;
    });

    const allies = allyTeam;

    // Each fighter's own chosen row forms the battlefield rows.
    const enemyRowEntries = rowEntriesOf(enemyTeam.getAll());
    const allyRowEntries = rowEntriesOf(allies.getAll());
    // The enemy characters a given reach can hit.
    const enemiesInReach = (range: 'short' | 'long' | 'all'): Character[] =>
        reachableTargets(range, enemyRowEntries);
    // The alive members of each row, front to back.
    const groupedByRow = (entries: RowEntry[]) =>
        ROWS.map((row) => ({
            row,
            members: entries
                .filter((entry) => entry.row === row && entry.character.stats.hp > 0)
                .map((entry) => entry.character),
        }));

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

        // Reactive skills reflect damage back at the attacker.
        if (outcome.reflect && outcome.reflect > 0) {
            attacker.stats.hp = Math.max(0, attacker.stats.hp - outcome.reflect);
            attacker.stats.isAlive = attacker.stats.hp > 0 ? 1 : 0;
            push(`${attacker.name} takes ${Math.round(outcome.reflect)} reflected damage!`, 'damage');
        }

        // Every basic attack tires the attacker, and ramps statuses
        // that grow with attacks (the Gate).
        if (gainFatigue(attacker, FATIGUE.gainPerAttack)) {
            push(`${attacker.name} collapses from exhaustion!`, 'damage');
        }
        rampGatePower(attacker);
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
        // Team auras apply before the first action of every round.
        syncAuras(allies.getAll());
        syncAuras(enemyTeam.getAll());
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
            case 'ALLY':
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
            // The enemy's reach decides which of your rows it can hit.
            const reachable = reachableTargets(effectiveRangeOf(enemy), allyRowEntries)
                .filter((character) => character.stats.hp > 0);
            const target = pickWeightedTarget(reachable, Math.random) ?? reachable[0];
            return { actor: enemy, kind: 'attack' as const, targets: target ? [target] : [] };
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
        // Fainted fighters lose their turn (the faint counts down).
        if (consumeFaintTurn(actor)) {
            push(`${actor.name} is unconscious and cannot act.`);
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

            // The shared skill resolver: same damage math the auto
            // battle engines use, so both flows always agree. Dispel
            // resolves by the target's side.
            const result = resolveSkillEffect(spec, actor, targets, {
                breakdown: showBreakdown,
                isEnemy: (character) => Boolean(enemyTeam.getCharacter(character.id)),
            });

            for (const effect of result.effects) {
                const target = allies.getCharacter(effect.targetId) ?? enemyTeam.getCharacter(effect.targetId);
                if (!target) continue;
                if (effect.damage > 0) {
                    lastHitBy.current.set(target.id, actor.id);
                    push(`${actor.name} used ${spec.name} on ${target.name}: ${Math.round(effect.damage)} damage.`, 'damage');
                    if (showBreakdown && effect.breakdown) {
                        pushBreakdown({ total: effect.damage, breakdown: effect.breakdown });
                    }
                }
                if (effect.heal > 0) {
                    push(`${actor.name} used ${spec.name} on ${target.name}: healed ${Math.round(effect.heal)} HP.`, 'heal');
                }
                if (effect.dispelled && effect.dispelled.length > 0) {
                    push(`${actor.name} dispelled ${effect.dispelled.join(', ')} from ${target.name}.`, 'info');
                }
            }
        }

        triggerTurnEnd(actor);

        // Someone may have fallen: team aura effects follow.
        syncAuras(allies.getAll());
        syncAuras(enemyTeam.getAll());
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
        if ((phase === 'won' || phase === 'lost' || phase === 'fled') && !settled.current) {
            settled.current = true;
            for (const character of [...allies.getAll(), ...enemyTeam.getAll()]) {
                clearStatuses(character, { keepPersistent: true });
            }
            const kills = enemyTeam.getAll()
                .filter((enemy) => enemy.stats.hp <= 0)
                .map((enemy) => ({ enemyId: enemy.id, killerId: lastHitBy.current.get(enemy.id) ?? '' }));
            const result = api.session.finishCombat(phase, { npc, placeId, kills, fightId, missionId });
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
                    clearStatuses(character, { keepPersistent: true });
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
        if (spec.targeting === 'ENEMY' || spec.targeting === 'ALLY' || spec.targeting === 'ANY') {
            // ENEMY skills pick from the enemy team, ALLY skills (Cover)
            // from the allies, and ANY skills (Cure, First Aid, Dispel)
            // from both sides.
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
        // ALLY skills pick from the allies; ANY skills from both teams.
        const pool = pending.kind === 'skill' && pending.spec.targeting === 'ALLY'
            ? [...aliveAllies]
            : [...aliveAllies, ...aliveEnemies];
        const targets = pool.filter((character) => ids.includes(character.id));
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
                        api.back();
                    }}
                >
                    Continue
                </button>
            </div>
        );
    }

    if (phase === 'pick-target' && pending) {
        const header = pending.kind === 'skill' ? pending.spec.name : 'Attack';
        const anyTarget = pending.kind === 'skill' && pending.spec.targeting === 'ANY';
        const allyOnly = pending.kind === 'skill' && pending.spec.targeting === 'ALLY';
        // Reach: skills use their own rangeOf (spells default to 'all');
        // basic attacks use the weapon's reach.
        const range = pending.kind === 'skill'
            ? pending.spec.rangeOf ?? 'all'
            : effectiveRangeOf(active ?? aliveAllies[0]);
        const reachableIds = new Set(enemiesInReach(range).map((character) => character.id));
        return (
            <div className="screen">
                <div className="section-title">{header} · choose a target</div>
                {anyTarget || allyOnly ? <div className="section-title" style={{ fontSize: 13 }}>Allies</div> : null}
                {anyTarget || allyOnly
                    ? (
                        <div className="battle-grid cols-3">
                            {aliveAllies.map((ally) => (
                                <CombatantSquare
                                    key={ally.id}
                                    character={ally}
                                    onClick={() => executePending([ally.id])}
                                />
                            ))}
                        </div>
                    )
                    : null}
                {!allyOnly ? <div className="section-title" style={{ fontSize: 13 }}>Enemies</div> : null}
                {!allyOnly
                    ? groupedByRow(enemyRowEntries).map(({ row, members }) => (
                        members.length === 0 ? null : (
                            <div key={row}>
                                <div className="row-banner">{ROW_LABELS[row]}</div>
                                <div className="battle-grid cols-3">
                                    {members.map((enemy) => (
                                        <CombatantSquare
                                            key={enemy.id}
                                            character={enemy}
                                            outOfReach={!reachableIds.has(enemy.id)}
                                            onClick={() => executePending([enemy.id])}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    ))
                    : null}
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
        const anyTarget = pending.spec.targeting === 'ANY';
        const reachableIds = anyTarget
            ? null
            : new Set(enemiesInReach(pending.spec.rangeOf ?? 'all').map((character) => character.id));
        return (
            <div className="screen">
                <div className="section-title">
                    {pending.spec.name} · select up to {max} targets ({selectedIds.length} selected)
                </div>
                {anyTarget ? <div className="section-title" style={{ fontSize: 13 }}>Allies</div> : null}
                {anyTarget
                    ? aliveAllies.map((ally) => {
                        const selected = selectedIds.includes(ally.id);
                        return (
                            <button key={ally.id} className="menu-item" onClick={() => toggleTarget(ally.id, max)}>
                                <span className="menu-icon">{selected ? '✅' : '💚'}</span>
                                <span className="menu-label">{ally.name}</span>
                                <span className="menu-sub">
                                    HP {Math.round(ally.getStat('hp'))}/{Math.round(ally.getStat('totalHp'))}
                                </span>
                            </button>
                        );
                    })
                    : null}
                {anyTarget ? <div className="section-title" style={{ fontSize: 13 }}>Enemies</div> : null}
                {aliveEnemies
                    .filter((enemy) => !reachableIds || reachableIds.has(enemy.id))
                    .map((enemy) => {
                        const selected = selectedIds.includes(enemy.id);
                        return (
                            <button key={enemy.id} className="menu-item" onClick={() => toggleTarget(enemy.id, max)}>
                                <span className="menu-icon">{selected ? '✅' : '🎯'}</span>
                                <span className="menu-label">{enemy.name}</span>
                                <span className="menu-sub">
                                    {enemy.position} · HP {Math.round(enemy.getStat('hp'))}/{Math.round(enemy.getStat('totalHp'))}
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
    // Base kit plus skills granted by live statuses (Open Gate unlocks
    // Fire Breath); activation skills hide once their status is active.
    const skillSpecs: SkillSpec[] = active
        ? battleSkillSpecs(
            active,
            api.session.availableSkillIds(active)
                .map((id) => specOf(id))
                .filter((spec): spec is SkillSpec => Boolean(spec)),
        )
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

    return (
        <div className="screen">
            <div className="section-title">Round {round} · Enemies</div>
            {aliveEnemies.length === 0 ? (
                <div className="empty">No enemies remain.</div>
            ) : (
                groupedByRow(enemyRowEntries).map(({ row, members }) => (
                    members.length === 0 ? null : (
                        <div key={row}>
                            <div className="row-banner">{ROW_LABELS[row]}</div>
                            <div className={`battle-grid cols-${columnsFor(members.length)}`}>
                                {members.map((enemy) => (
                                    <CombatantSquare key={enemy.id} character={enemy} />
                                ))}
                            </div>
                        </div>
                    )
                ))
            )}

            <div className="section-title">Your party</div>
            {groupedByRow(allyRowEntries).map(({ row, members }) => (
                members.length === 0 ? null : (
                    <div key={row}>
                        <div className="row-banner">{ROW_LABELS[row]}</div>
                        <div className={`battle-grid cols-${columnsFor(members.length)}`}>
                            {members.map((ally) => (
                                <CombatantSquare
                                    key={ally.id}
                                    character={ally}
                                    active={ally.id === active?.id}
                                    picked={pickedIds.has(ally.id)}
                                />
                            ))}
                        </div>
                    </div>
                )
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
                    <button className="btn btn--danger" onClick={() => setPhase('fled')}>🏃 Run</button>
                </div>
            ) : null}
        </div>
    );
}
