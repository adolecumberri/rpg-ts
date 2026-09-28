import { useEffect, useRef, useState } from 'react';
import { Battlefield } from '../components/UI/Battlefield';
import type { BattleUnit } from '../components/UI/Battlefield';
import { FloatingDamageLayer } from '../components/UI/FloatingDamage';
import type { DamageKind, FloatingHit } from '../components/UI/FloatingDamage';
import { SPRITES } from '../assets/sprites';
import type { SpriteRole } from '../assets/sprites';

const TICK_MS = 120;
// The attack window: the one-shot swing runs 600ms (4 frames x 150ms);
// the damage resolves after 6 ticks (720ms), so the animation always
// ends at least once before the card returns to idle — never chopped.
const ATTACK_TICKS = 6;

const ROLE_INFO: Record<SpriteRole, {
    row: 'front' | 'center' | 'back';
    power: number;
    // Ticks between attacks (the attack interval, like the dev
    // autofight): warriors swing slower, archers harass faster.
    interval: number;
    reach: 'short' | 'long' | 'all';
}> = {
    warrior: { row: 'front', power: 4, interval: 6, reach: 'short' },
    mage: { row: 'center', power: 3, interval: 5, reach: 'long' },
    archer: { row: 'back', power: 2, interval: 4, reach: 'all' },
};

type StressUnit = BattleUnit & {
    role: SpriteRole;
    power: number;
    interval: number;
    reach: 'short' | 'long' | 'all';
};

type PendingAttack = {
    attackerId: string;
    targetId: string;
    power: number;
    side: 'ally' | 'enemy';
    resolveTick: number;
};

type BattleState = { allies: StressUnit[]; enemies: StressUnit[] };

// 80 units per team: the role decides the row — warriors front, mages
// center, archers back — and each unit carries its own sprite set.
function buildTeam(prefix: string): StressUnit[] {
    const roles: SpriteRole[] = ['warrior', 'mage', 'archer'];
    const units: StressUnit[] = [];
    for (let index = 0; index < 80; index++) {
        const role = roles[index % roles.length];
        const info = ROLE_INFO[role];
        units.push({
            id: `${prefix}_${index}`,
            name: `${role} ${index + 1}`,
            row: info.row,
            hp: 40,
            maxHp: 40,
            level: 1 + (index % 3),
            sprite: SPRITES[role],
            role,
            power: info.power,
            interval: info.interval,
            reach: info.reach,
        });
    }
    return units;
}

/**
 * The stress fight with the real autofight loop: one shared tick
 * advances the battle. Each unit acts on its own attack interval,
 * picks a VALID target of the other team (by its reach), swaps to the
 * one-shot attack animation, and the damage lands when the animation
 * window resolves — then the card returns to idle.
 */
export function StressFightScreen() {
    const [battle, setBattle] = useState<BattleState>(() => ({
        allies: buildTeam('a'),
        enemies: buildTeam('e'),
    }));
    const [running, setRunning] = useState(false);
    const [hits, setHits] = useState<FloatingHit[]>([]);

    const battleRef = useRef(battle);
    const pendingRef = useRef<PendingAttack[]>([]);
    const tickRef = useRef(0);
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

    const updateBattle = (next: BattleState) => {
        battleRef.current = next;
        setBattle(next);
    };

    const reset = () => {
        setRunning(false);
        pendingRef.current = [];
        tickRef.current = 0;
        setHits([]);
        updateBattle({ allies: buildTeam('a'), enemies: buildTeam('e') });
    };

    useEffect(() => {
        if (!running) return;

        const timer = window.setInterval(() => {
            tickRef.current += 1;
            const now = tickRef.current;
            const current = battleRef.current;
            let allies = current.allies;
            let enemies = current.enemies;

            // 1) Resolve the attacks whose animation window ended: the
            // damage lands now and the attacker returns to idle.
            const due = pendingRef.current.filter((attack) => attack.resolveTick <= now);
            pendingRef.current = pendingRef.current.filter((attack) => attack.resolveTick > now);

            const allyDamage = new Map<string, number>();
            const enemyDamage = new Map<string, number>();
            const allyAttackers: string[] = [];
            const enemyAttackers: string[] = [];
            for (const attack of due) {
                if (attack.side === 'ally') {
                    enemyDamage.set(attack.targetId, (enemyDamage.get(attack.targetId) ?? 0) + attack.power);
                    allyAttackers.push(attack.attackerId);
                } else {
                    allyDamage.set(attack.targetId, (allyDamage.get(attack.targetId) ?? 0) + attack.power);
                    enemyAttackers.push(attack.attackerId);
                }
            }

            const resolveInto = (team: StressUnit[], attackers: string[], damage: Map<string, number>): StressUnit[] =>
                team.map((unit) => {
                    const dealt = damage.get(unit.id) ?? 0;
                    if (dealt > 0) return { ...unit, hp: Math.max(0, unit.hp - dealt), attacking: false };
                    if (attackers.indexOf(unit.id) !== -1) return { ...unit, attacking: false };
                    return unit;
                });
            allies = resolveInto(allies, allyAttackers, allyDamage);
            enemies = resolveInto(enemies, enemyAttackers, enemyDamage);

            // 2) Floating numbers over the freshly damaged cards.
            spawnHits(allyDamage, 'physical');
            spawnHits(enemyDamage, 'physical');

            // 2) Units whose interval arrived start a new attack: only
            // valid targets of the other team (reach), one random pick.
            const startFor = (attackers: StressUnit[], defenders: StressUnit[], side: 'ally' | 'enemy'): StressUnit[] => {
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
            allies = startFor(allies, enemies, 'ally');
            enemies = startFor(enemies, allies, 'enemy');

            updateBattle({ allies, enemies });
        }, TICK_MS);

        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [running]);

    const aliveAllies = battle.allies.filter((unit) => unit.hp > 0).length;
    const aliveEnemies = battle.enemies.filter((unit) => unit.hp > 0).length;

    return (
        <div className="newui-page pixel-font" ref={pageRef} style={{ position: 'relative' }}>
            <FloatingDamageLayer hits={hits} onDone={removeHit} />
            <div className="pixel-panel">
                <div className="pixel-title">Stress · 80 vs 80 · tick engine</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                    <button
                        className={`pixel-btn${running ? ' pixel-btn--danger' : ' pixel-btn--primary'}`}
                        style={{ height: 'var(--s8)' }}
                        onClick={() => setRunning((value) => !value)}
                    >
                        {running ? '⏸ Stop' : '▶ Auto fight'}
                    </button>
                    <button className="pixel-btn" style={{ height: 'var(--s8)' }} onClick={reset}>
                        ↺ Reset
                    </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Allies alive: {aliveAllies}/80 · Enemies alive: {aliveEnemies}/80
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row' }}>
                <Battlefield title="Enemies" units={battle.enemies} shrink side="left" />
                <Battlefield title="Allies" units={battle.allies} shrink side="right" />
            </div>
        </div>
    );
}

// Reach of a unit inside a team: closest filled row (short), that row
// plus the next (long), every row (all).
function reachableIdsOf(units: BattleUnit[], range: 'short' | 'long' | 'all'): Set<string> {
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
