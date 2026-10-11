import { useEffect, useRef, useState } from 'react';
import type { Character } from '@rpg';
import { BattleTracker, FIGHTS, buildHybridCombat, trackHybridEvent } from '@core';
import type {
    HybridAutoEvent,
    HybridManualEvent,
    HybridSetup,
} from '@core';
import { useGame } from '../game/GameContext';
import { Battlefield } from '../components/UI/Battlefield';
import type { BattleUnit } from '../components/UI/Battlefield';
import { JrpgArena } from '../components/UI/JrpgArena';
import { FloatingDamageLayer } from '../components/UI/FloatingDamage';
import type { DamagePart, FloatingHit } from '../components/UI/FloatingDamage';
import { TargetBar } from '../components/UI/TargetBar';
import { OptionsBar } from '../components/UI/OptionsBar';
import { selectionRulesOf } from '../game/targeting';
import { SPRITES, spriteRoleOf } from '../assets/sprites';
import type { PendingBattle } from '../components/UI/MessageBox';

/**
 * The real story battle screen. It receives the queued battle (fightId,
 * placeId, missionId), builds the fight on the hybrid engine with the
 * session's own characters (the team, the fight's allyIds and its
 * enemies), and runs it: automatic fighters resolve instantly, manual
 * fighters pause for a target pick, and the battle-end settlement goes
 * through session.finishCombat — so missions, XP, win flags, fainting
 * and the spectral boar rules all fire exactly like the engine tests.
 * A BattleTracker observes every event for the post-battle report.
 */
export function CombatScreen({ battle, onEnd }: { battle: PendingBattle; onEnd: () => void }) {
    const api = useGame();
    const session = api.session;
    const fight = FIGHTS[battle.fightId];

    const [version, setVersion] = useState(0);
    const [prompt, setPrompt] = useState<HybridManualEvent | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [hits, setHits] = useState<FloatingHit[]>([]);
    const [log, setLog] = useState<string>('');
    const [inspectedId, setInspectedId] = useState<string | null>(null);

    const pageRef = useRef<HTMLDivElement | null>(null);
    const hitIdRef = useRef(0);
    const trackerRef = useRef(new BattleTracker());
    const killsRef = useRef<{ enemyId: string; killerId: string }[]>([]);
    const setupRef = useRef<HybridSetup | null>(null);
    const settledRef = useRef(false);

    // ---- floating numbers ---------------------------------------------
    const removeHit = (id: number) => setHits((prev) => prev.filter((hit) => hit.id !== id));

    const spawnFloating = (targetId: string, parts: DamagePart[], text?: 'evade' | 'miss') => {
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

    const partsOf = (amount: number, byKind: HybridAutoEvent['damageByKind']): DamagePart[] => {
        const parts: DamagePart[] = [];
        if (byKind?.physical) parts.push({ element: 'physical', amount: Math.round(byKind.physical) });
        if (byKind?.magical) parts.push({ element: 'arcane', amount: Math.round(byKind.magical) });
        if (byKind?.true) parts.push({ element: 'true', amount: Math.round(byKind.true) });
        if (parts.length === 0) parts.push({ element: 'physical', amount: Math.round(amount) });
        return parts;
    };

    // ---- event projection ---------------------------------------------
    const handleAutoEvent = (event: HybridAutoEvent) => {
        trackHybridEvent(trackerRef.current, event);
        if (event.kills && event.kills.length > 0) {
            for (const kill of event.kills) {
                killsRef.current.push({ enemyId: kill.targetId, killerId: kill.killerId });
            }
        } else if (!event.targetAlive && event.targetId) {
            killsRef.current.push({ enemyId: event.targetId, killerId: event.actorId });
        }

        if (event.note === 'evaded') {
            spawnFloating(event.targetId, [], 'evade');
        } else if (event.note === 'missed') {
            spawnFloating(event.targetId, [], 'miss');
        } else if (event.effects && event.effects.length > 0) {
            for (const effect of event.effects) {
                if (effect.heal > 0) {
                    spawnFloating(effect.targetId, [{ element: 'heal', amount: Math.round(effect.heal) }]);
                }
                if (effect.damage > 0) {
                    spawnFloating(effect.targetId, partsOf(effect.damage, effect.byKind));
                }
            }
        } else {
            if (event.heal && event.heal > 0) {
                spawnFloating(event.targetId, [{ element: 'heal', amount: Math.round(event.heal) }]);
            } else if (event.damage > 0) {
                spawnFloating(event.targetId, partsOf(event.damage, event.damageByKind));
            }
            if (event.reflect && event.reflect > 0) {
                spawnFloating(event.actorId, partsOf(event.reflect, event.reflectByKind));
            }
        }
    };

    // ---- engine setup --------------------------------------------------
    if (!setupRef.current && fight) {
        setupRef.current = buildHybridCombat(session, fight, {
            onAction: handleAutoEvent,
        });
    }
    const setup = setupRef.current;

    // ---- the engine loop ----------------------------------------------
    const settle = (result: 'won' | 'lost' | 'fled') => {
        if (settledRef.current || !setup) return;
        settledRef.current = true;
        const fighters = setup.allies.filter((ally) => !session.team.getCharacter(ally.id));
        const outcome = session.finishCombat(result, {
            placeId: battle.placeId,
            fightId: battle.fightId,
            missionId: battle.missionId,
            kills: killsRef.current,
            fighters,
            participants: setup.allies,
            tracker: trackerRef.current,
        });
        setLog(outcome.message);
        // Hand control back to the router (the mission beat queue and
        // the story engine already advanced inside finishCombat).
        window.setTimeout(() => onEnd(), outcome.report ? 2400 : 1400);
    };

    const drainRef = useRef<() => void>(() => {});
    drainRef.current = () => {
        const combat = setupRef.current?.combat;
        if (!combat || settledRef.current) return;
        for (let guard = 0; guard < 2000; guard++) {
            const event = combat.next();
            if (event.kind === 'end') {
                // 'left' wins; a draw counts as a defeat (no win flag).
                settle(event.winner === 'left' ? 'won' : 'lost');
                setVersion((value) => value + 1);
                return;
            }
            if (event.kind === 'manual') {
                setPrompt(event);
                setSelected([]);
                setVersion((value) => value + 1);
                return;
            }
            // 'auto' events were projected by the onAction observer.
        }
        setVersion((value) => value + 1);
    };

    useEffect(() => {
        drainRef.current();
    }, []);

    const pickTarget = (targetId: string) => {
        const combat = setupRef.current?.combat;
        if (!combat) return;
        combat.resolveManual(targetId);
        setPrompt(null);
        setInspectedId(null);
        setVersion((value) => value + 1);
        drainRef.current();
    };

    const pickSkill = (skillId: string, targetId?: string) => {
        const combat = setupRef.current?.combat;
        if (!combat) return;
        combat.resolveManualSkill(skillId, targetId);
        setPrompt(null);
        setInspectedId(null);
        setVersion((value) => value + 1);
        drainRef.current();
    };

    const flee = () => settle('fled');

    // ---- presentation --------------------------------------------------
    if (!fight || !setup) {
        return (
            <div className="action-bar-demo pixel-font">
                <div className="action-bar-demo-content">
                    <div className="pixel-panel">
                        <div className="pixel-title">⚔ Combate</div>
                        <div style={{ fontSize: 'var(--s3)', color: 'var(--muted)', marginBottom: 'var(--s2)' }}>
                            Unknown fight: {battle.fightId}.
                        </div>
                    </div>
                </div>
                <OptionsBar
                    options={[]}
                    back={{ label: 'Atrás', onClick: onEnd }}
                />
            </div>
        );
    }

    const unitOf = (character: Character): BattleUnit => ({
        id: character.id,
        name: character.name,
        sprite: SPRITES[spriteRoleOf(character) ?? 'warrior'],
        row: character.position === 'center' || character.position === 'back' ? character.position : 'front',
        hp: Math.round(character.stats.hp),
        maxHp: Math.round(character.stats.totalHp),
        level: character.experience.level,
    });

    const actor = prompt ? setup.allies.find((ally) => ally.id === prompt.actorId) : undefined;
    const promptTargets = prompt ? prompt.targets.map((id) => {
        const enemy = setup.enemies.find((entry) => entry.id === id);
        return { id, label: enemy ? enemy.name : id };
    }) : [];

    // Small battles get the JRPG pseudo-3D arena (the design-stitch
    // reference); the card layout stays for the big tick battles.
    const small = setup.allies.length + setup.enemies.length <= 10;

    void version;

    if (small) {
        return (
            <div className="jrpg-fight pixel-font" ref={pageRef} style={{ position: 'relative' }}>
                <FloatingDamageLayer hits={hits} onDone={removeHit} />
                <JrpgArena
                    allies={setup.allies}
                    enemies={setup.enemies}
                    activeId={prompt?.actorId}
                    inspectedId={inspectedId ?? undefined}
                    skillIds={prompt?.skills}
                    targets={promptTargets}
                    onTarget={pickTarget}
                    onInspect={(id) => setInspectedId(id)}
                    onSkill={pickSkill}
                    onFlee={flee}
                />
                {log ? <div className="newui-toast">{log}</div> : null}
            </div>
        );
    }

    return (
        <div className="fight-page pixel-font" ref={pageRef} style={{ position: 'relative' }}>
            <FloatingDamageLayer hits={hits} onDone={removeHit} />
            <div className="pixel-panel">
                <div className="pixel-title">⚔ {fight.id} · {fight.mode ?? 'turn'}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                    {battle.placeId} · mission {battle.missionId || '—'}
                </div>
                {prompt && actor ? (
                    <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 4 }}>
                        ▶ {actor.name} is up — pick a target.
                    </div>
                ) : (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                        The battle rages on…
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0 }}>
                <Battlefield title="Enemies" units={setup.enemies.map(unitOf)} shrink side="left" />
                <Battlefield title="Allies" units={setup.allies.map(unitOf)} shrink side="right" />
            </div>

            {prompt ? (
                <TargetBar
                    targets={promptTargets}
                    rules={selectionRulesOf({ targeting: 'ENEMY', count: 1, poolSize: promptTargets.length })}
                    selection={selected}
                    onToggle={(id) => setSelected([id])}
                    onAccept={() => {
                        if (selected[0]) pickTarget(selected[0]);
                    }}
                    onCancel={() => setSelected([])}
                />
            ) : (
                <OptionsBar
                    size="lg"
                    options={[{
                        id: 'flee',
                        label: 'Huir',
                        icon: { symbol: 'directions_run', color: 'var(--accent)' },
                        tone: 'danger',
                        onClick: flee,
                    }]}
                />
            )}

            {log ? <div className="newui-toast">{log}</div> : null}
        </div>
    );
}
