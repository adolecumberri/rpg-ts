import type { Character, IntervalDamageResolver } from '../../../src';
import { generalAttackResolver } from '../damage/general';
import { intervalFromSpeed } from '../config/speed';
import { planAutoAction } from './autoSkills';
import type { AutoSkillCooldowns, AutoSkillMeters } from './autoSkills';
import { syncAuras } from './aura';
import { pickSkillTargets } from './autoSkills';
import { resolveSkillEffect } from './skillEffects';
import { consumeFaintTurn } from './fatigue';
import { battleSkillSpecs, specOf } from '../skills';
import type { SkillSpec } from '../skills';
import type { ComponentLine } from '../damage/composer';
import type { WorldSession } from '../session';
import type { FightDefinition } from '../config/fights';
import type { DamageKindTotals } from './battleTracker';
import { kindTotalsOfBreakdown } from './battleTracker';

// ---------------------------------------------------------------------------
// The hybrid combat: the tick engine of the interval battle, but the
// player's party members are manual. Automatic fighters (the farmers)
// act whenever their interval tick arrives; when a manual fighter's tick
// arrives the engine pauses and asks for a target instead. Automatic
// fighters can use their skills through the auto skill planner.
// ---------------------------------------------------------------------------

export type HybridSide = 'left' | 'right';

export type HybridCombatant = {
    character: Character;
    // Acts whenever the global tick index is a multiple of this interval.
    interval: number;
    side: HybridSide;
    // Manual fighters pause the engine and wait for resolveManual.
    manual?: boolean;
    // Skills the fighter may use automatically (the player's manual
    // actions stay basic attacks for now).
    skills?: SkillSpec[];
};

export type HybridTargetEffect = {
    targetId: string;
    damage: number;
    heal: number;
    // Post-mitigation damage split by kind (trackers consume it).
    byKind?: Partial<DamageKindTotals>;
};

export type HybridAutoEvent = {
    kind: 'auto';
    tick: number;
    actorId: string;
    targetId: string;
    damage: number;
    // Post-mitigation damage split by kind (trackers consume it).
    damageByKind?: Partial<DamageKindTotals>;
    // Counter-attack the defender answered with (basic attacks).
    reflect?: number;
    reflectByKind?: Partial<DamageKindTotals>;
    // Total healing of a skill action (0 for basic attacks).
    heal?: number;
    targetHpAfter: number;
    targetAlive: boolean;
    // Skill actions carry the spec id and every target; basic attacks
    // leave them undefined.
    skillId?: string;
    targetIds?: string[];
    // Per-target resolution of a skill action (damage, heal, kind).
    effects?: HybridTargetEffect[];
    // Enemies that died from this action (kill attribution for XP).
    kills?: { targetId: string; killerId: string }[];
    note?: string;
};

export type HybridManualEvent = {
    kind: 'manual';
    tick: number;
    actorId: string;
    // Enemy ids the player may target right now.
    targets: string[];
    // Skills the player may cast instead of a basic attack.
    skills?: string[];
};

export type HybridEndEvent = {
    kind: 'end';
    winner: HybridSide | 'draw';
    ticks: number;
};

export type HybridEvent = HybridAutoEvent | HybridManualEvent | HybridEndEvent;

export type HybridCombatOptions = {
    maxTicks?: number;
    // Injectable random source for deterministic tests.
    random?: () => number;
    // Delegates the damage math of every basic hit (defaults to the
    // general attack resolver, so weapons with onAttack/onHit hooks work).
    damageResolver?: IntervalDamageResolver;
    // Optional observer: fires with every resolved action — the battle
    // trackers attach here.
    onAction?: (event: HybridAutoEvent) => void;
};

export class HybridCombat {
    private combatants: HybridCombatant[];
    private tick = 0;
    private maxTicks: number;
    private random: () => number;
    private damageResolver: IntervalDamageResolver;
    private onAction?: (event: HybridAutoEvent) => void;
    // Fighters whose interval arrived on the current tick, still queued.
    private due: HybridCombatant[] = [];
    // A manual fighter waiting for the player to pick a target.
    private pendingManual: HybridCombatant | null = null;
    // Per fighter: skillId -> actions the skill stays locked.
    private cooldowns = new Map<string, AutoSkillCooldowns>();
    // Per fighter: skillId -> the current ramped chance (patience).
    private meters = new Map<string, AutoSkillMeters>();
    // Per side: skillId -> actions a sharedCooldown skill stays locked
    // for the whole side.
    private sharedCooldowns = new Map<HybridSide, AutoSkillCooldowns>();

    constructor(combatants: HybridCombatant[], options: HybridCombatOptions = {}) {
        for (const combatant of combatants) {
            if (!Number.isFinite(combatant.interval) || combatant.interval < 1) {
                throw new Error(`Invalid interval for ${combatant.character.name}: ${combatant.interval}.`);
            }
        }
        this.combatants = combatants;
        this.maxTicks = options.maxTicks ?? 1000;
        this.random = options.random ?? Math.random;
        this.damageResolver = options.damageResolver ?? generalAttackResolver;
        this.onAction = options.onAction;
        // Team auras apply from the first action on.
        this.syncAllAuras();
    }

    /** Applies/removes aura effects on both sides (cheap, idempotent). */
    private syncAllAuras(): void {
        syncAuras(this.combatants.filter((entry) => entry.side === 'left').map((entry) => entry.character));
        syncAuras(this.combatants.filter((entry) => entry.side === 'right').map((entry) => entry.character));
    }

    allCombatants(): HybridCombatant[] {
        return [...this.combatants];
    }

    private alive(side: HybridSide): HybridCombatant[] {
        return this.combatants.filter(
            (combatant) => combatant.side === side && combatant.character.stats.hp > 0,
        );
    }

    private winner(): HybridSide | 'draw' | null {
        const left = this.alive('left').length;
        const right = this.alive('right').length;
        if (left === 0 && right === 0) return 'draw';
        if (left === 0) return 'right';
        if (right === 0) return 'left';
        return null;
    }

    private alliesOf(actor: HybridCombatant): HybridCombatant[] {
        return this.alive(actor.side);
    }

    private enemiesOf(actor: HybridCombatant): HybridCombatant[] {
        return this.alive(actor.side === 'left' ? 'right' : 'left');
    }

    private cooldownsOf(id: string): AutoSkillCooldowns {
        let map = this.cooldowns.get(id);
        if (!map) {
            map = new Map();
            this.cooldowns.set(id, map);
        }
        return map;
    }

    private metersOf(id: string): AutoSkillMeters {
        let map = this.meters.get(id);
        if (!map) {
            map = new Map();
            this.meters.set(id, map);
        }
        return map;
    }

    private sharedCooldownsOf(side: HybridSide): AutoSkillCooldowns {
        let map = this.sharedCooldowns.get(side);
        if (!map) {
            map = new Map();
            this.sharedCooldowns.set(side, map);
        }
        return map;
    }

    private manualEvent(actor: HybridCombatant): HybridManualEvent {
        return {
            kind: 'manual',
            tick: this.tick,
            actorId: actor.character.id,
            targets: this.enemiesOf(actor).map((entry) => entry.character.id),
            skills: this.skillsOf(actor).map((spec) => spec.id),
        };
    }

    /**
     * The skills a fighter may use right now: its base kit plus the
     * skills granted by its live statuses (Open Gate unlocks Fire
     * Breath), hiding activation skills whose status is already active.
     */
    private skillsOf(actor: HybridCombatant): SkillSpec[] {
        return battleSkillSpecs(actor.character, actor.skills ?? []);
    }

    /**
     * Advances the battle to the next event: one automatic action (a
     * skill or an attack), a manual prompt (the engine pauses until
     * resolveManual answers it), or the end of the battle.
     */
    next(): HybridEvent {
        const finished = this.winner();
        if (finished) return { kind: 'end', winner: finished, ticks: this.tick };

        if (this.pendingManual) {
            if (this.pendingManual.character.stats.hp <= 0) {
                this.pendingManual = null;
                return this.next();
            }
            return this.manualEvent(this.pendingManual);
        }

        // Find the next tick with at least one due fighter (skipping
        // empty ticks).
        while (this.due.length === 0) {
            this.tick++;
            if (this.tick > this.maxTicks) {
                return { kind: 'end', winner: 'draw', ticks: this.tick };
            }
            const ended = this.winner();
            if (ended) return { kind: 'end', winner: ended, ticks: this.tick };
            this.due = this.combatants
                .filter(
                    (combatant) =>
                        combatant.character.stats.hp > 0 && this.tick % combatant.interval === 0,
                )
                .sort((a, b) =>
                    a.interval - b.interval ||
                    a.character.id.localeCompare(b.character.id));
        }

        const actor = this.due.shift() as HybridCombatant;
        if (actor.character.stats.hp <= 0) return this.next();

        // Fainted fighters lose this action (their faint counts down).
        if (consumeFaintTurn(actor.character)) return this.next();

        if (actor.manual) {
            this.pendingManual = actor;
            return this.manualEvent(actor);
        }

        // Automatic fighter: the skill planner decides (skills first,
        // basic attack as the fallback).
        const plan = planAutoAction({
            actor: actor.character,
            allies: this.alliesOf(actor).map((entry) => entry.character),
            enemies: this.enemiesOf(actor).map((entry) => entry.character),
            skills: this.skillsOf(actor),
            cooldowns: this.cooldownsOf(actor.character.id),
            meters: this.metersOf(actor.character.id),
            sharedCooldowns: this.sharedCooldownsOf(actor.side),
            random: this.random,
        });

        if (plan.kind === 'attack') {
            const target = this.enemiesOf(actor).find(
                (entry) => entry.character.id === plan.targetId,
            );
            if (!target) return this.next();
            return this.performAttack(actor, target);
        }
        return this.performSkill(actor, plan.spec, plan.targetIds);
    }

    /**
     * The player answered the pending manual prompt: attack the target.
     * Returns the resolved attack event (null when no prompt was pending
     * or the target is invalid).
     */
    resolveManual(targetId: string): HybridAutoEvent | null {
        if (!this.pendingManual) return null;
        const actor = this.pendingManual;
        const target = this.enemiesOf(actor).find(
            (entry) => entry.character.id === targetId,
        );
        if (!target) return null;
        this.pendingManual = null;
        return this.performAttack(actor, target);
    }

    /**
     * The player answered the pending manual prompt: cast one of the
     * fighter's skills (targets follow the spec's targeting). Manual
     * skill use ignores auto policies and cooldowns: the player decides.
     */
    resolveManualSkill(skillId: string): HybridAutoEvent | null {
        if (!this.pendingManual) return null;
        const actor = this.pendingManual;
        const spec = this.skillsOf(actor).find((entry) => entry.id === skillId);
        if (!spec) return null;
        this.pendingManual = null;
        const targetIds = pickSkillTargets(
            spec,
            actor.character,
            this.alliesOf(actor).map((entry) => entry.character),
            this.enemiesOf(actor).map((entry) => entry.character),
            this.random,
        );
        return this.performSkill(actor, spec, targetIds);
    }

    private performAttack(actor: HybridCombatant, target: HybridCombatant): HybridAutoEvent {
        const resolved = this.damageResolver(actor.character, target.character, this.random);

        target.character.stats.hp = Math.max(0, target.character.stats.hp - resolved.damage);
        target.character.stats.isAlive = target.character.stats.hp > 0 ? 1 : 0;

        if (resolved.reflect && resolved.reflect > 0) {
            actor.character.stats.hp = Math.max(0, actor.character.stats.hp - resolved.reflect);
            actor.character.stats.isAlive = actor.character.stats.hp > 0 ? 1 : 0;
        }

        // Tick combat: after every attack both fighters run their
        // after_attack and after_turn status moments, so statuses like
        // Bleeding tick once per attack. No-op without statuses.
        for (const character of [actor.character, target.character]) {
            character.statusManager.trigger('after_attack');
            character.statusManager.trigger('after_turn');
        }
        // Someone may have fallen: aura effects follow.
        this.syncAllAuras();

        const event: HybridAutoEvent = {
            kind: 'auto',
            tick: this.tick,
            actorId: actor.character.id,
            targetId: target.character.id,
            damage: resolved.damage,
            damageByKind: resolved.byKind,
            reflect: resolved.reflect,
            reflectByKind: resolved.reflectByKind,
            targetHpAfter: target.character.stats.hp,
            targetAlive: target.character.stats.hp > 0,
            note: resolved.note,
        };
        this.onAction?.(event);
        return event;
    }

    private performSkill(
        actor: HybridCombatant,
        spec: SkillSpec,
        targetIds: string[],
    ): HybridAutoEvent {
        const targets = targetIds
            .map((id) => this.combatants.find(
                (entry) => entry.character.id === id && entry.character.stats.hp > 0,
            ))
            .filter((entry): entry is HybridCombatant => Boolean(entry))
            .map((entry) => entry.character);

        const enemyIds = new Set(this.enemiesOf(actor).map((entry) => entry.character.id));
        const result = resolveSkillEffect(spec, actor.character, targets, {
            isEnemy: (character) => enemyIds.has(character.id),
            breakdown: true,
        });

        const kills: { targetId: string; killerId: string }[] = [];
        for (const effect of result.effects) {
            if (effect.damage <= 0) continue;
            const target = this.combatants.find(
                (entry) => entry.character.id === effect.targetId,
            )?.character;
            if (target && target.stats.hp <= 0) {
                kills.push({ targetId: target.id, killerId: actor.character.id });
            }
        }

        // Skill actions run the same status moments as attacks, so
        // statuses like Bleeding keep ticking once per action.
        const involved = [actor.character, ...targets];
        for (const character of involved) {
            character.statusManager.trigger('after_attack');
            character.statusManager.trigger('after_turn');
        }
        this.syncAllAuras();

        const primary = targets[0];
        const event: HybridAutoEvent = {
            kind: 'auto',
            tick: this.tick,
            actorId: actor.character.id,
            targetId: primary?.id ?? '',
            damage: result.totalDamage,
            damageByKind: kindTotalsOfBreakdown(
                result.effects.reduce(
                    (lines: ComponentLine[], effect) => lines.concat(effect.breakdown ?? []),
                    [],
                ),
            ),
            heal: result.totalHeal,
            targetHpAfter: primary ? primary.stats.hp : 0,
            targetAlive: primary ? primary.stats.hp > 0 : false,
            skillId: spec.id,
            targetIds: targets.map((target) => target.id),
            effects: result.effects.map((effect) => ({
                targetId: effect.targetId,
                damage: effect.damage,
                heal: effect.heal,
                byKind: kindTotalsOfBreakdown(effect.breakdown ?? []),
            })),
            kills: kills.length > 0 ? kills : undefined,
            note: spec.name,
        };
        this.onAction?.(event);
        return event;
    }
}

// A hybrid battle ready to run plus its fighter lists (for the UI and
// for settling kills/XP afterwards).
export type HybridSetup = {
    combat: HybridCombat;
    allies: Character[];
    enemies: Character[];
};

/** The SkillSpecs a character knows (base skills plus tree nodes). */
function skillSpecsOf(session: WorldSession, character: Character): SkillSpec[] {
    return session.availableSkillIds(character)
        .map((id) => specOf(id))
        .filter((spec): spec is SkillSpec => Boolean(spec));
}

/**
 * Builds a fight's hybrid battle. By default the player's party members
 * are manual (the player picks their targets) and the fight's roster
 * allies (allyIds) and generated allies fight automatically. When the
 * fight declares a manualId, the player controls that character instead
 * and their own party stays out of the battle.
 */
export function buildHybridCombat(
    session: WorldSession,
    fight: FightDefinition,
    options: HybridCombatOptions = {},
): HybridSetup {
    const left: HybridCombatant[] = [];
    const allies: Character[] = [];

    if (fight.manualId) {
        const manual =
            session.team.getCharacter(fight.manualId)
            ?? session.roster.character(fight.manualId)
            ?? session.findNpc(fight.manualId)?.character;
        if (manual) {
            left.push({
                character: manual,
                interval: intervalFromSpeed(manual.getStat('speed')),
                side: 'left',
                manual: true,
                skills: skillSpecsOf(session, manual),
            });
            allies.push(manual);
        }
    } else {
        for (const member of session.team.getAll()) {
            left.push({
                character: member,
                interval: intervalFromSpeed(member.getStat('speed')),
                side: 'left',
                manual: true,
                skills: skillSpecsOf(session, member),
            });
            allies.push(member);
        }
    }
    for (const id of fight.allyIds ?? []) {
        const ally = session.roster.character(id);
        if (ally) {
            left.push({
                character: ally,
                interval: intervalFromSpeed(ally.getStat('speed')),
                side: 'left',
                skills: skillSpecsOf(session, ally),
            });
            allies.push(ally);
        }
    }
    for (const ally of fight.allies?.() ?? []) {
        left.push({
            character: ally,
            interval: intervalFromSpeed(ally.getStat('speed')),
            side: 'left',
            skills: skillSpecsOf(session, ally),
        });
        allies.push(ally);
    }

    const enemies = fight.enemies();
    const right: HybridCombatant[] = enemies.map((enemy) => ({
        character: enemy,
        interval: intervalFromSpeed(enemy.getStat('speed')),
        side: 'right',
        skills: skillSpecsOf(session, enemy),
    }));

    return {
        combat: new HybridCombat([...left, ...right], options),
        allies,
        enemies,
    };
}
