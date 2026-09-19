import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../game/GameContext';
import {
    buildIntervalCombatants,
    buildIntervalStressCombatants,
    columnsFor,
    grantIntervalKillXp,
    resolveIntervalDemo,
    resolveIntervalStressDemo,
} from '@core';
import type { IntervalBattleEntry, IntervalCombatResult, StressBattleSize } from '@core';

const IS_DEV = import.meta.env.DEV;

type BattleMode = 'real' | StressBattleSize;

const MODES: { mode: BattleMode; label: string }[] = [
    { mode: 'real', label: 'Real' },
    { mode: 'small', label: '6v10' },
    { mode: 'big', label: '8v16' },
    { mode: 'huge', label: '15v30' },
    { mode: 'giant', label: '80v120' },
];

// Reveal speed per mode: bigger battles have way more turns.
const REVEAL_MS: Record<BattleMode, number> = { real: 650, small: 120, big: 60, huge: 30, giant: 30 };

// Turns revealed per timer tick: giant battles advance several at once.
const REVEAL_STEP: Record<BattleMode, number> = { real: 1, small: 1, big: 1, huge: 1, giant: 3 };

// A hit keeps its cards glowing for a short window of turns, so fast or
// batched reveals never move an HP bar without visible feedback.
const FLASH_WINDOW: Record<BattleMode, number> = { real: 1, small: 3, big: 6, huge: 8, giant: 8 };

// Only the last entries of the log stay in the DOM so huge battles keep
// rendering fast.
const LOG_LIMIT = 100;

export function IntervalCombatScreen() {
    const api = useGame();
    const [combatants, setCombatants] = useState(() => buildIntervalCombatants(api.session));
    const [result, setResult] = useState<IntervalCombatResult | null>(null);
    const [shown, setShown] = useState(0);
    const [mode, setMode] = useState<BattleMode>('real');
    const timer = useRef<number | undefined>(undefined);
    const killCursor = useRef(0);
    const logRef = useRef<HTMLDivElement | null>(null);

    const snapshotHp = (entries: { character: { id: string; getStat: (stat: 'hp') => number } }[]) => {
        const map = new Map<string, number>();
        for (const entry of entries) {
            map.set(entry.character.id, entry.character.getStat('hp'));
        }
        return map;
    };

    const initialHp = useRef<Map<string, number>>(
        snapshotHp([...combatants.left, ...combatants.right]),
    );

    const build = (nextMode: BattleMode) =>
        nextMode === 'real' ? buildIntervalCombatants(api.session) : buildIntervalStressCombatants(nextMode);

    const resolve = (nextMode: BattleMode) =>
        nextMode === 'real' ? resolveIntervalDemo(api.session) : resolveIntervalStressDemo(nextMode);

    // Names and max HP, looked up by id in O(1) while big battles animate.
    const info = useMemo(() => {
        const names = new Map<string, string>();
        const maxHp = new Map<string, number>();
        for (const entry of [...combatants.left, ...combatants.right]) {
            names.set(entry.character.id, entry.character.name);
            maxHp.set(entry.character.id, entry.character.stats.totalHp);
        }
        return { names, maxHp };
    }, [combatants]);

    // Reveal the timeline tick by tick, slow enough to follow.
    useEffect(() => {
        if (result && shown < result.turns.length) {
            timer.current = window.setTimeout(() => {
                setShown((count) => Math.min(count + REVEAL_STEP[mode], result.turns.length));
            }, REVEAL_MS[mode]);
        }
        return () => {
            if (timer.current) window.clearTimeout(timer.current);
        };
    }, [result, shown, mode]);

    // Keep the log pinned to the newest revealed entry.
    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [shown]);

    // Grant XP the moment a kill is revealed; the cursor avoids rescanning
    // the whole timeline on every reveal step.
    useEffect(() => {
        if (!result) return;
        while (killCursor.current < shown) {
            const turn = result.turns[killCursor.current];
            killCursor.current++;
            if (!turn.targetAlive) {
                const outcome = grantIntervalKillXp(api.session, turn.actorId);
                api.refresh();
                if (outcome.message) api.showToast(outcome.message);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result, shown]);

    const start = () => {
        killCursor.current = 0;
        const fresh = build(mode);
        setCombatants(fresh);
        initialHp.current = snapshotHp([...fresh.left, ...fresh.right]);
        setResult(resolve(mode));
        setShown(0);
    };

    const pickMode = (nextMode: BattleMode) => {
        setMode(nextMode);
        killCursor.current = 0;
        const fresh = build(nextMode);
        setCombatants(fresh);
        initialHp.current = snapshotHp([...fresh.left, ...fresh.right]);
        setResult(null);
        setShown(0);
    };

    // HP of every fighter after each revealed turn, built once per result
    // so huge battles stay cheap to animate.
    const hpTimeline = useMemo(() => {
        const timeline = new Map<string, number[]>();
        const current = new Map<string, number>();
        for (const entry of [...combatants.left, ...combatants.right]) {
            const hp = initialHp.current.get(entry.character.id) ?? 0;
            current.set(entry.character.id, hp);
            timeline.set(entry.character.id, [hp]);
        }
        if (result) {
            for (const turn of result.turns) {
                const after = Math.max(0, (current.get(turn.targetId) ?? 0) - turn.damageApplied);
                current.set(turn.targetId, after);
                for (const [id, series] of timeline) {
                    series.push(current.get(id) ?? series[series.length - 1]);
                }
            }
        }
        return timeline;
    }, [result, combatants]);

    // Live HP during the animation: the timeline entry for `shown` turns.
    const currentHpOf = (id: string): number => {
        const series = hpTimeline.get(id);
        if (!series) return 0;
        return series[Math.min(shown, series.length - 1)];
    };

    const nameOf = (id: string): string => info.names.get(id) ?? id;
    const maxHpOf = (id: string): number => info.maxHp.get(id) ?? 1;

    const finished = result !== null && shown >= result.turns.length;

    // Every attacker and target of the last few revealed turns keeps the
    // glow inside the window, so no revealed hit is ever invisible.
    const flashIds = useMemo(() => {
        const ids = new Set<string>();
        if (!result || shown === 0) return ids;
        const from = Math.max(0, shown - FLASH_WINDOW[mode]);
        for (let index = from; index < shown; index++) {
            ids.add(result.turns[index].actorId);
            ids.add(result.turns[index].targetId);
        }
        return ids;
    }, [result, shown, mode]);

    const renderCombatant = (entry: IntervalBattleEntry) => {
        const id = entry.character.id;
        const dead = currentHpOf(id) <= 0;
        const maxHp = maxHpOf(id);
        const hp = currentHpOf(id);
        const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
        const active = !finished && flashIds.has(id);
        const classes = ['combatant-square'];
        if (dead) classes.push('dead');
        if (active) classes.push('active');
        return (
            <div key={id} className={classes.join(' ')}>
                <div className="portrait">
                    {entry.image ? <img src={entry.image} alt={entry.character.name} /> : <span>{dead ? '💀' : entry.icon}</span>}
                </div>
                <div className="name">{entry.character.name}</div>
                <div className="stats">
                    ⚔️ {Math.round(entry.character.getStat('attack'))} · 🛡️ {Math.round(entry.character.getStat('defence'))}
                </div>
                <div className="hp-row">
                    <div className="bar">
                        <div className="bar-fill hp" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="hp-text">{Math.round(hp)}/{Math.round(maxHp)}</span>
                </div>
                <div className="interval tag">⏱️ {entry.interval}</div>
            </div>
        );
    };

    const gridClasses = (count: number): string => `battle-grid cols-${columnsFor(count)}`;

    const logStart = Math.max(0, shown - LOG_LIMIT);

    return (
        <div className="screen">
            <div className="card" style={{ padding: 12 }}>
                <div className="section-title">Allies</div>
                <div className={gridClasses(combatants.left.length)}>
                    {combatants.left.map((entry) => renderCombatant(entry))}
                </div>
                <div className="section-title" style={{ marginTop: 12 }}>Enemies</div>
                <div className={gridClasses(combatants.right.length)}>
                    {combatants.right.map((entry) => renderCombatant(entry))}
                </div>
            </div>

            {IS_DEV ? (
                <div className="btn-row">
                    {MODES.map((option) => (
                        <button
                            key={option.mode}
                            className={`btn${mode === option.mode ? ' btn--selected' : ''}`}
                            onClick={() => pickMode(option.mode)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            ) : null}

            {result === null ? (
                <button className="btn btn--primary" onClick={start}>▶ Start battle</button>
            ) : (
                <>
                    <div className="log" ref={logRef}>
                        {logStart > 0 ? <div className="entry info">… {logStart} earlier hits</div> : null}
                        {result.turns.slice(logStart, shown).map((turn, index) => (
                            <div key={logStart + index} className={`entry ${turn.damageApplied > 0 ? 'damage' : 'info'}`}>
                                [tick {turn.tick}] {nameOf(turn.actorId)} → {nameOf(turn.targetId)} for {Math.round(turn.damageApplied)}
                                {' '}({nameOf(turn.targetId)} HP {Math.round(turn.targetHpAfter)}/{Math.round(maxHpOf(turn.targetId))})
                                {!turn.targetAlive ? ' 💀' : ''}
                            </div>
                        ))}
                        {shown < result.turns.length ? <div className="entry info">…</div> : null}
                    </div>

                    {finished ? (
                        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
                            <div style={{ fontSize: 44 }}>
                                {result.winner === 'left' ? '🏆' : result.winner === 'right' ? '💀' : '🤝'}
                            </div>
                            <h2 style={{ margin: '6px 0' }}>
                                {result.winner === 'left' ? 'Victory!' : result.winner === 'right' ? 'Defeat' : 'Draw'}
                            </h2>
                            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                                Battle ended at tick {result.ticks} · {result.turns.length} attacks
                            </div>
                        </div>
                    ) : null}

                    {finished ? (
                        <button className="btn" onClick={() => { setResult(null); setShown(0); }}>
                            ↺ Run again
                        </button>
                    ) : null}
                </>
            )}
        </div>
    );
}
