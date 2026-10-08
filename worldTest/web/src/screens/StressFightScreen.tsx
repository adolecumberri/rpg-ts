import { useEffect, useRef, useState } from 'react';
import type { Character } from '@rpg';
import {
    ARCHER_JOB,
    BattleTracker,
    HEALER_JOB,
    HybridCombat,
    Items,
    SOLDIER_JOB,
    characterGenerator,
    intervalFromSpeed,
    skillIdsOf,
    specOf,
    trackHybridEvent,
} from '@core';
import type { BattleReport, HybridAutoEvent, HybridEvent, SkillSpec } from '@core';
import { Battlefield } from '../components/UI/Battlefield';
import type { BattleUnit } from '../components/UI/Battlefield';
import { BattleReportPanel } from '../components/UI/BattleReportPanel';
import { FloatingDamageLayer } from '../components/UI/FloatingDamage';
import type { DamagePart, FloatingHit } from '../components/UI/FloatingDamage';
import { SPRITES } from '../assets/sprites';
import type { SpriteRole } from '../assets/sprites';

const TICK_MS = 120;
// Actions resolved per UI tick: the real engine runs one action per
// next() call, so the interval loop consumes several to keep pace.
const ACTIONS_PER_TICK = 8;

type ArmyEntry = {
    character: Character;
    role: SpriteRole;
    row: 'front' | 'center' | 'back';
};

// 80 units per team, built with the real character generator: one
// third soldiers (front, Silver Bolts passive), one third archers
// (back, 25% evasion) and one third healers/mages (center, 10%
// evasion, auto Cure below 30% hp). Each carries its class weapon.
function buildArmy(prefix: string): ArmyEntry[] {
    const kinds = [
        {
            job: SOLDIER_JOB,
            role: 'warrior' as SpriteRole,
            row: 'front' as const,
            evasion: 0,
            hand: Items.sword,
            // Silver Bullets: every 3rd hit against the same enemy
            // deals 10% of its max hp as true damage.
            skills: ['silver_bolts'],
        },
        {
            job: ARCHER_JOB,
            role: 'archer' as SpriteRole,
            row: 'back' as const,
            evasion: 25,
            hand: Items.bow,
        },
        {
            job: HEALER_JOB,
            role: 'mage' as SpriteRole,
            row: 'center' as const,
            evasion: 10,
            hand: Items.staff,
        },
    ];
    const army: ArmyEntry[] = [];
    for (let index = 0; index < 80; index++) {
        const kind = kinds[index % kinds.length];
        const character = characterGenerator({
            job: kind.job,
            level: 1 + (index % 3),
            id: `${prefix}_${index}`,
            hand: kind.hand,
            skills: (kind as { skills?: string[] }).skills,
        });
        character.stats.evasion = kind.evasion;
        army.push({ character, role: kind.role, row: kind.row });
    }
    return army;
}

/** The specs the auto planner may use for a generated fighter. */
function battleSpecsOf(character: Character): SkillSpec[] {
    return skillIdsOf(character)
        .map((id) => specOf(id))
        .filter((spec): spec is SkillSpec => Boolean(spec));
}

/** The battlefield card snapshot of a live character. */
function unitOf(entry: ArmyEntry): BattleUnit {
    return {
        id: entry.character.id,
        name: entry.character.name,
        sprite: SPRITES[entry.role],
        row: entry.row,
        hp: Math.round(entry.character.stats.hp),
        maxHp: Math.round(entry.character.stats.totalHp),
        level: entry.character.experience.level,
    };
}

/**
 * The stress fight, now driven by the REAL combat system: both armies
 * are generated characters (the generator + the Order jobs) and the
 * battle runs on the HybridCombat engine with the general attack
 * resolver — real damage math, evasion, counters and status moments.
 * The UI only projects the engine's state and its event stream.
 */
export function StressFightScreen() {
    const [units, setUnits] = useState<{ left: BattleUnit[]; right: BattleUnit[] }>(() => {
        const left = buildArmy('a');
        const right = buildArmy('e');
        return { left: left.map(unitOf), right: right.map(unitOf) };
    });
    const [running, setRunning] = useState(false);
    const [winner, setWinner] = useState<'left' | 'right' | 'draw' | null>(null);
    const [hits, setHits] = useState<FloatingHit[]>([]);
    const [report, setReport] = useState<BattleReport | null>(null);
    const [showReport, setShowReport] = useState(false);

    const combatRef = useRef<HybridCombat | null>(null);
    const trackerRef = useRef<BattleTracker | null>(null);
    const armiesRef = useRef<{ left: ArmyEntry[]; right: ArmyEntry[] }>({
        left: [],
        right: [],
    });
    const pageRef = useRef<HTMLDivElement | null>(null);
    const hitIdRef = useRef(0);

    const removeHit = (id: number) => setHits((prev) => prev.filter((hit) => hit.id !== id));

    // Floats one entry over a card (a damage composite, a heal or a
    // text-only EVADE/MISS).
    const spawnFloating = (
        targetId: string,
        parts: DamagePart[],
        text?: 'evade' | 'miss',
    ) => {
        const page = pageRef.current;
        if (!page) return;
        const cell = document.querySelector(`[data-unit-id="${targetId}"]`);
        if (!cell) return;
        const rect = cell.getBoundingClientRect();
        setHits((prev) => [...prev, {
            id: ++hitIdRef.current,
            parts,
            text,
            x: rect.left - page.getBoundingClientRect().left + rect.width / 2,
            y: rect.top - page.getBoundingClientRect().top + 8,
        }].slice(-40));
    };

    // Projects one resolved engine event into the UI: hp numbers come
    // from the live characters, the floats from the event's data. The
    // same event feeds the battle tracker for the post-battle report.
    const handleAction = (event: HybridAutoEvent) => {
        if (trackerRef.current) trackHybridEvent(trackerRef.current, event);
        if (event.note === 'evaded') {
            spawnFloating(event.targetId, [], 'evade');
        } else if (event.note === 'missed') {
            spawnFloating(event.targetId, [], 'miss');
        } else if (event.heal && event.heal > 0) {
            spawnFloating(event.targetId, [{ element: 'heal', amount: Math.round(event.heal) }]);
        } else if (event.damage > 0) {
            const parts: DamagePart[] = [];
            if (event.damageByKind?.physical) {
                parts.push({ element: 'physical', amount: Math.round(event.damageByKind.physical) });
            }
            if (event.damageByKind?.magical) {
                parts.push({ element: 'arcane', amount: Math.round(event.damageByKind.magical) });
            }
            if (event.damageByKind?.true) {
                parts.push({ element: 'true', amount: Math.round(event.damageByKind.true) });
            }
            if (parts.length === 0) {
                parts.push({ element: 'physical', amount: Math.round(event.damage) });
            }
            spawnFloating(event.targetId, parts);
        }
    };

    const buildBattle = () => {
        const left = buildArmy('a');
        const right = buildArmy('e');
        armiesRef.current = { left, right };
        const combatants = [
            ...left.map((entry) => ({
                character: entry.character,
                interval: intervalFromSpeed(entry.character.getStat('speed')),
                side: 'left' as const,
                skills: battleSpecsOf(entry.character),
            })),
            ...right.map((entry) => ({
                character: entry.character,
                interval: intervalFromSpeed(entry.character.getStat('speed')),
                side: 'right' as const,
                skills: battleSpecsOf(entry.character),
            })),
        ];
        combatRef.current = new HybridCombat(combatants, {
            maxTicks: 200000,
            onAction: handleAction,
        });
        trackerRef.current = new BattleTracker();
        setUnits({ left: left.map(unitOf), right: right.map(unitOf) });
    };

    const reset = () => {
        setRunning(false);
        setWinner(null);
        setHits([]);
        setReport(null);
        setShowReport(false);
        buildBattle();
    };

    useEffect(() => {
        if (!running) return;

        const timer = window.setInterval(() => {
            const combat = combatRef.current;
            if (!combat) return;

            let finished: 'left' | 'right' | 'draw' | null = null;
            for (let step = 0; step < ACTIONS_PER_TICK; step++) {
                const event: HybridEvent = combat.next();
                if (event.kind === 'end') {
                    finished = event.winner;
                    break;
                }
                // 'auto' events are handled by the onAction observer.
            }

            const armies = armiesRef.current;
            setUnits({
                left: armies.left.map(unitOf),
                right: armies.right.map(unitOf),
            });

            if (finished) {
                setRunning(false);
                setWinner(finished);
                setReport(trackerRef.current ? trackerRef.current.report() : null);
            }
        }, TICK_MS);

        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [running]);

    const aliveLeft = units.left.filter((unit) => unit.hp > 0).length;
    const aliveRight = units.right.filter((unit) => unit.hp > 0).length;

    return (
        <div className="newui-page pixel-font" ref={pageRef} style={{ position: 'relative' }}>
            <FloatingDamageLayer hits={hits} onDone={removeHit} />
            <div className="pixel-panel">
                <div className="pixel-title">Stress · 80 vs 80 · hybrid engine</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                    <button
                        className={`pixel-btn${running ? ' pixel-btn--danger' : ' pixel-btn--primary'}`}
                        style={{ height: 'var(--s8)' }}
                        onClick={() => {
                            if (!combatRef.current) buildBattle();
                            setRunning((value) => !value);
                        }}
                    >
                        {running ? '⏸ Stop' : '▶ Auto fight'}
                    </button>
                    <button className="pixel-btn" style={{ height: 'var(--s8)' }} onClick={reset}>
                        ↺ Reset
                    </button>
                    <button
                        className="pixel-btn"
                        style={{ height: 'var(--s8)' }}
                        disabled={!report}
                        onClick={() => setShowReport(true)}
                    >
                        📊 Report
                    </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Allies alive: {aliveLeft}/80 · Enemies alive: {aliveRight}/80
                    {winner ? ` · Winner: ${winner}` : ''}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row' }}>
                <Battlefield title="Enemies" units={units.right} shrink side="left" />
                <Battlefield title="Allies" units={units.left} shrink side="right" />
            </div>

            {showReport && report ? (
                <div className="fight-overlay report-modal-overlay">
                    <div
                        style={{
                            minWidth: 'var(--s48)',
                            maxWidth: '92%',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                            <button
                                type="button"
                                className="pixel-btn"
                                style={{ height: 'var(--s8)' }}
                                onClick={() => setShowReport(false)}
                            >
                                ✕ Close
                            </button>
                        </div>
                        <div style={{ overflowY: 'auto' }}>
                            <BattleReportPanel
                                report={report}
                                nameOf={(id) => {
                                    const entry = armiesRef.current.left
                                        .concat(armiesRef.current.right)
                                        .find((candidate) => candidate.character.id === id);
                                    return entry ? entry.character.name : id;
                                }}
                                sides={[
                                    { name: 'Allies', ids: armiesRef.current.left.map((entry) => entry.character.id) },
                                    { name: 'Enemies', ids: armiesRef.current.right.map((entry) => entry.character.id) },
                                ]}
                            />
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
