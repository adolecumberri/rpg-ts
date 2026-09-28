import { useEffect, useRef, useState } from 'react';
import { Battlefield } from './Battlefield';
import { ActionsBattlefield } from './ActionsBattlefield';
import { FloatingDamageLayer } from './FloatingDamage';
import type { DamageKind, FloatingHit } from './FloatingDamage';
import { OptionsBar } from './OptionsBar';
import type { OptionSpec } from './OptionsBar';
import { TargetBar } from './TargetBar';
import { selectionRulesOf } from '../../game/targeting';
import type { FightUnit } from '../../game/armyPresets';

export type FightMode = 'ticks' | 'actions';

const TICK_MS = 120;
// The attack window: the one-shot swing runs 600ms (4 frames x 150ms);
// the damage resolves after 6 ticks (720ms), so the animation always
// ends at least once before the card returns to idle — never chopped.
const ATTACK_TICKS = 6;

// A queued attack in ticks mode: the swing started, the damage lands
// when the tick reaches resolveTick.
type PendingAttack = {
    attackerId: string;
    targetId: string;
    power: number;
    side: 'a' | 'b';
    resolveTick: number;
};

type FightSide = {
    teamA: FightUnit[];
    teamB: FightUnit[];
};

const cloneAll = (units: FightUnit[]): FightUnit[] => units.map((unit) => ({ ...unit }));

// Reach of a unit inside a team: closest filled row (short), that row
// plus the next (long), every occupied row (all).
function reachableIdsOf(units: FightUnit[], range: 'short' | 'long' | 'all'): Set<string> {
    const rows: Array<'front' | 'center' | 'back'> = ['front', 'center', 'back'];
    const occupied = rows.filter((row) => units.some((unit) => unit.row === row && unit.hp > 0));
    const reachable: Array<'front' | 'center' | 'back'> = [];
    if (range === 'all') {
        reachable.push(...occupied);
    } else if (occupied.length > 0) {
        reachable.push(occupied[0]);
        if (range === 'long' && occupied[1]) reachable.push(occupied[1]);
    }
    return new Set(
        units
            .filter((unit) => unit.hp > 0 && reachable.indexOf(unit.row) !== -1)
            .map((unit) => unit.id),
    );
}

/**
 * The generic fight: the definitive battle component. It renders the
 * two battlefields, the floating damage numbers and the winner overlay,
 * and runs one of the two engines:
 *
 *  - ticks: the autofight loop (one shared tick, per-unit attack
 *    intervals, reach-valid targets, swing-then-resolve). No action
 *    menu, the battlefields render full-size side by side.
 *  - actions: turn-based — the acting unit picks a target through the
 *    action menu (OptionsBar/TargetBar pinned under the battlefield
 *    area), damage lands on accept, then a random enemy strikes back.
 *    The two teams render vertically in half-page panels, as a single
 *    pool of full-size fichas (no formation rows).
 *
 * The screen owns the armies; Fight only fights. teamA is the side the
 * player controls in actions mode.
 */
export function Fight({
    mode,
    teamA,
    teamB,
    labels,
    onExit,
}: {
    mode: FightMode;
    teamA: FightUnit[];
    teamB: FightUnit[];
    labels?: { a: string; b: string };
    onExit?: () => void;
}) {
    const labelA = labels && labels.a ? labels.a : 'Team A';
    const labelB = labels && labels.b ? labels.b : 'Team B';

    // ---- shared: floating damage -------------------------------------
    const [hits, setHits] = useState<FloatingHit[]>([]);
    const pageRef = useRef<HTMLDivElement | null>(null);
    const hitIdRef = useRef(0);

    const removeHit = (id: number) => setHits((prev) => prev.filter((hit) => hit.id !== id));

    // Spawns a rising number over every damaged unit's card, positioned
    // relative to the page (the FloatingDamageLayer's box).
    const spawnHits = (damage: Map<string, number>, kind: DamageKind) => {
        const page = pageRef.current;
        if (!page || damage.size === 0) return;
        const pageRect = page.getBoundingClientRect();
        const fresh: FloatingHit[] = [];
        for (const [targetId, amount] of damage) {
            const cell = document.querySelector(`[data-unit-id="${targetId}"]`);
            if (!cell) continue;
            const rect = cell.getBoundingClientRect();
            fresh.push({
                id: ++hitIdRef.current,
                amount: Math.round(amount),
                kind,
                x: rect.left - pageRect.left + rect.width / 2,
                y: rect.top - pageRect.top + 8,
            });
        }
        if (fresh.length > 0) {
            setHits((prev) => [...prev, ...fresh].slice(-40));
        }
    };

    const spawnHit = (targetId: string, amount: number, kind: DamageKind) => {
        spawnHits(new Map([[targetId, amount]]), kind);
    };

    // ---- shared: winner + rematch ------------------------------------
    const [winner, setWinner] = useState<'a' | 'b' | null>(null);
    const initialRef = useRef({ teamA, teamB });

    // ---- ticks engine -------------------------------------------------
    const [ticks, setTicks] = useState<FightSide>(() => ({
        teamA: cloneAll(teamA),
        teamB: cloneAll(teamB),
    }));
    const [running, setRunning] = useState(false);
    const ticksRef = useRef(ticks);
    const pendingRef = useRef<PendingAttack[]>([]);
    const tickRef = useRef(0);

    const updateTicks = (next: FightSide) => {
        ticksRef.current = next;
        setTicks(next);
    };

    // ---- actions engine ------------------------------------------------
    const [allies, setAllies] = useState<FightUnit[]>(() => cloneAll(teamA));
    const [enemies, setEnemies] = useState<FightUnit[]>(() => cloneAll(teamB));
    const [turn, setTurn] = useState(0);
    const [phase, setPhase] = useState<'pick' | 'targets'>('pick');
    const [selected, setSelected] = useState<string[]>([]);

    const rematch = () => {
        const freshA = cloneAll(initialRef.current.teamA);
        const freshB = cloneAll(initialRef.current.teamB);
        const next = { teamA: freshA, teamB: freshB };
        setRunning(false);
        pendingRef.current = [];
        tickRef.current = 0;
        ticksRef.current = next;
        setTicks(next);
        setAllies(freshA);
        setEnemies(freshB);
        setTurn(0);
        setPhase('pick');
        setSelected([]);
        setWinner(null);
        setHits([]);
    };

    useEffect(() => {
        if (mode !== 'ticks' || !running) return;

        const timer = window.setInterval(() => {
            tickRef.current += 1;
            const now = tickRef.current;
            const current = ticksRef.current;
            let teamA = current.teamA;
            let teamB = current.teamB;

            // 1) Resolve the attacks whose swing window ended: the
            // damage lands now and the attacker returns to idle.
            const due = pendingRef.current.filter((attack) => attack.resolveTick <= now);
            pendingRef.current = pendingRef.current.filter((attack) => attack.resolveTick > now);

            const damageA = new Map<string, number>();
            const damageB = new Map<string, number>();
            const attackersA: string[] = [];
            const attackersB: string[] = [];
            for (const attack of due) {
                if (attack.side === 'a') {
                    damageB.set(attack.targetId, (damageB.get(attack.targetId) ?? 0) + attack.power);
                    attackersA.push(attack.attackerId);
                } else {
                    damageA.set(attack.targetId, (damageA.get(attack.targetId) ?? 0) + attack.power);
                    attackersB.push(attack.attackerId);
                }
            }

            const resolveInto = (
                units: FightUnit[],
                attackers: string[],
                damage: Map<string, number>,
            ): FightUnit[] => units.map((unit) => {
                const dealt = damage.get(unit.id) ?? 0;
                if (dealt > 0) return { ...unit, hp: Math.max(0, unit.hp - dealt), attacking: false };
                if (attackers.indexOf(unit.id) !== -1) return { ...unit, attacking: false };
                return unit;
            });
            teamA = resolveInto(teamA, attackersA, damageA);
            teamB = resolveInto(teamB, attackersB, damageB);

            // 2) Floating numbers over the freshly damaged cards.
            spawnHits(damageA, 'physical');
            spawnHits(damageB, 'physical');

            // 3) Units whose interval arrived start a new attack: only
            // reach-valid targets of the other team, one random pick.
            const startFor = (attackers: FightUnit[], defenders: FightUnit[], side: 'a' | 'b'): FightUnit[] => {
                const aliveDefenders = defenders.filter((unit) => unit.hp > 0);
                if (aliveDefenders.length === 0) return attackers;
                return attackers.map((unit) => {
                    if (unit.hp <= 0 || unit.attacking) return unit;
                    if (now % unit.interval !== 0) return unit;
                    const reachable = reachableIdsOf(aliveDefenders, unit.reach);
                    const options = aliveDefenders.filter((defender) => reachable.has(defender.id));
                    if (options.length === 0) return unit;
                    const target = options[Math.floor(Math.random() * options.length)];
                    pendingRef.current.push({
                        attackerId: unit.id,
                        targetId: target.id,
                        power: unit.power,
                        side,
                        resolveTick: now + ATTACK_TICKS,
                    });
                    return { ...unit, attacking: true };
                });
            };
            teamA = startFor(teamA, teamB, 'a');
            teamB = startFor(teamB, teamA, 'b');

            updateTicks({ teamA, teamB });

            if (teamA.every((unit) => unit.hp <= 0)) {
                setRunning(false);
                setWinner('b');
            } else if (teamB.every((unit) => unit.hp <= 0)) {
                setRunning(false);
                setWinner('a');
            }
        }, TICK_MS);

        return () => window.clearInterval(timer);
    }, [mode, running]);

    const aliveAllies = allies.filter((unit) => unit.hp > 0);
    const aliveEnemies = enemies.filter((unit) => unit.hp > 0);
    const active = aliveAllies[turn % Math.max(1, aliveAllies.length)];

    const reachableIds = active ? reachableIdsOf(aliveEnemies, active.reach) : new Set<string>();

    const attackRules = selectionRulesOf({
        targeting: 'ENEMY',
        count: 1,
        poolSize: aliveEnemies.length,
    });

    // The acting ally hits the picked enemy; a random alive enemy
    // strikes back and the turn passes.
    const commit = (enemyId: string) => {
        if (!active || winner) return;
        const enemy = enemies.find((entry) => entry.id === enemyId);
        if (!enemy) return;

        setEnemies((prev) => prev.map((entry) =>
            entry.id === enemyId ? { ...entry, hp: Math.max(0, entry.hp - active.power) } : entry,
        ));
        spawnHit(enemyId, active.power, 'physical');

        const remaining = enemies.filter((entry) =>
            entry.id === enemyId ? enemy.hp - active.power > 0 : entry.hp > 0,
        );
        if (remaining.length === 0) {
            setWinner('a');
            setPhase('pick');
            return;
        }

        const striker = remaining[Math.floor(Math.random() * remaining.length)];
        const targets = allies.filter((entry) => entry.hp > 0);
        const victim = targets[Math.floor(Math.random() * targets.length)];
        setAllies((prev) => prev.map((entry) =>
            entry.id === victim.id ? { ...entry, hp: Math.max(0, entry.hp - striker.power) } : entry,
        ));
        spawnHit(victim.id, striker.power, 'physical');

        const survivors = allies.filter((entry) =>
            entry.id === victim.id ? victim.hp - striker.power > 0 : entry.hp > 0,
        );
        if (survivors.length === 0) {
            setWinner('b');
            setPhase('pick');
            return;
        }

        setTurn((t) => t + 1);
        setPhase('pick');
        setSelected([]);
    };

    const winnerOverlay = winner ? (
        <div className="fight-overlay">
            <div className="pixel-panel" style={{ textAlign: 'center', minWidth: 'var(--s36)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{winner === 'a' ? '🏆' : '💀'}</div>
                <div className="pixel-title" style={{ borderBottom: 'none', marginBottom: 8 }}>
                    {winner === 'a' ? `${labelA} wins!` : `${labelB} wins!`}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button type="button" className="pixel-btn pixel-btn--primary" onClick={rematch}>
                        Rematch
                    </button>
                    {onExit ? (
                        <button type="button" className="pixel-btn" onClick={onExit}>← Setup</button>
                    ) : null}
                </div>
            </div>
        </div>
    ) : null;

    if (mode === 'ticks') {
        const aliveA = ticks.teamA.filter((unit) => unit.hp > 0).length;
        const aliveB = ticks.teamB.filter((unit) => unit.hp > 0).length;
        return (
            <div className="fight-page pixel-font" ref={pageRef}>
                <FloatingDamageLayer hits={hits} onDone={removeHit} />
                <div className="pixel-panel">
                    <div className="pixel-title">Ticks · {labelA} vs {labelB}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                        <button
                            type="button"
                            className={`pixel-btn${running ? ' pixel-btn--danger' : ' pixel-btn--primary'}`}
                            style={{ height: 'var(--s8)' }}
                            onClick={() => setRunning((value) => !value)}
                        >
                            {running ? '⏸ Stop' : '▶ Start'}
                        </button>
                        <button type="button" className="pixel-btn" style={{ height: 'var(--s8)' }} onClick={rematch}>
                            ↺ Reset
                        </button>
                        {onExit ? (
                            <button type="button" className="pixel-btn" style={{ height: 'var(--s8)' }} onClick={onExit}>
                                ← Setup
                            </button>
                        ) : null}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {labelA}: {aliveA}/{ticks.teamA.length} · {labelB}: {aliveB}/{ticks.teamB.length}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    <Battlefield title={labelA} units={ticks.teamA} shrink side="left" />
                    <Battlefield title={labelB} units={ticks.teamB} shrink side="right" />
                </div>
                {winnerOverlay}
            </div>
        );
    }

    // Actions: the battlefield area fills the page between the top and
    // the pinned action menu; the menu swaps between OptionsBar (pick
    // phase) and TargetBar (target phase).
    const actionOptions: OptionSpec[] = [
        {
            id: 'attack',
            label: 'Attack',
            icon: '⚔️',
            tone: 'primary',
            onClick: () => {
                setSelected([]);
                setPhase('targets');
            },
        },
    ];
    if (onExit) {
        actionOptions.push({
            id: 'setup',
            label: 'Setup',
            icon: '←',
            onClick: onExit,
        });
    }

    return (
        <div className="fight-page pixel-font" ref={pageRef}>
            <FloatingDamageLayer hits={hits} onDone={removeHit} />
            <div className="fight-arena fight-arena--actions">
                <ActionsBattlefield units={enemies} selectedIds={new Set(selected)} />
                <ActionsBattlefield units={allies} activeId={active ? active.id : undefined} />
            </div>
            {winner === null && phase === 'targets' && active ? (
                <TargetBar
                    targets={aliveEnemies.map((enemy) => ({
                        id: enemy.id,
                        label: enemy.name,
                        icon: enemy.icon,
                        reachable: reachableIds.has(enemy.id),
                    }))}
                    rules={attackRules}
                    selection={selected}
                    onToggle={(id) => setSelected((current) =>
                        current.indexOf(id) !== -1 ? [] : [id])}
                    onAccept={() => commit(selected[0])}
                    onCancel={() => {
                        setPhase('pick');
                        setSelected([]);
                    }}
                />
            ) : (
                <OptionsBar options={actionOptions} size="lg" />
            )}
            {winnerOverlay}
        </div>
    );
}
