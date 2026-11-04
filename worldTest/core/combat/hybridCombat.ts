import type { Character, IntervalDamageResolver, Item } from '../../../src';
import { generalAttackResolver } from '../damage/general';
import { intervalFromSpeed } from '../config/speed';
import { MANA } from '../config/mana';
import { planAutoAction } from './autoSkills';
import type { AutoSkillCooldowns, AutoSkillMeters } from './autoSkills';
import { syncAuras } from './aura';
import { pickSkillTargets } from './autoSkills';
import { resolveSkillEffect } from './skillEffects';
import { consumeFaintTurn } from './fatigue';
import { consumeStunTurn, applyStatus, clearStatuses, crewStatus } from '../statuses';
import { equipInto, equippedItemsOf, unequipHole } from '../equipment/loadout';
import { canAffordSkill, hpCostOf } from './skillGating';
import { battleSkillSpecs } from '../skills';
import type { SkillSpec } from '../skills';
import { specForSkill } from '../jobs/progression';
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
            // Mana: every fighter starts the battle at startOfBattle.
            const totalMana = combatant.character.stats.totalMana ?? 0;
            combatant.character.stats.mana = Math.min(totalMana, MANA.startOfBattle);
        }
        this.combatants = combatants;
        this.maxTicks = options.maxTicks ?? 1000;
        this.random = options.random ?? Math.random;
        this.damageResolver = options.damageResolver ?? generalAttackResolver;
        this.onAction = options.onAction;
        // Passive skills apply their battle-start effects AFTER the
        // combatants are assigned, so team-aware passives (Crew) can see
        // both sides. X-mastery passives check their equipment requirement
        // here and only then add their permanent battle status.
        for (const combatant of this.combatants) {
            for (const spec of combatant.skills ?? []) {
                if (!spec.passive) continue;
                if (spec.statusOnSelf) {
                    applyStatus(combatant.character, spec.statusOnSelf);
                }
                if (spec.mastery) {
                    const equippedWeaponTypes = equippedItemsOf(combatant.character)
                        .map((item) => item.definition.weaponType)
                        .filter((weaponType): weaponType is NonNullable<typeof weaponType> => Boolean(weaponType));
                    const fits = !spec.mastery.weaponType ||
                        (equippedWeaponTypes as string[]).indexOf(spec.mastery.weaponType) !== -1;
                    if (fits) applyStatus(combatant.character, spec.mastery.status);
                }
            }
        }
        // Team auras and crew bonuses apply from the first action on.
        this.syncAllAuras();
        this.syncCrew();
    }

    /** Applies/removes aura effects on both sides (cheap, idempotent). */
    private syncAllAuras(): void {
        syncAuras(this.combatants.filter((entry) => entry.side === 'left').map((entry) => entry.character));
        syncAuras(this.combatants.filter((entry) => entry.side === 'right').map((entry) => entry.character));
        this.syncCrew();
    }

    /**
     * Crew: every living ally whose held job matches a crew passive's
     * jobId carries a "Crew X" status with X = living members of that job.
     * The status is rebuilt when X changes (a Pirate died, a side changed).
     */
    private syncCrew(): void {
        for (const side of ['left', 'right'] as HybridSide[]) {
            const living = this.combatants.filter(
                (entry) => entry.side === side && entry.character.stats.hp > 0,
            );
            const configs = new Map<string, { jobId: string; attackPerMember: number }>();
            for (const member of living) {
                for (const spec of member.skills ?? []) {
                    if (spec.passive && spec.crew) configs.set(spec.crew.jobId, spec.crew);
                }
            }
            for (const config of configs.values()) {
                const count = living.filter(
                    (entry) => entry.character.jobId === config.jobId,
                ).length;
                for (const member of living) {
                    // Drop the previous Crew status; it is rebuilt from the
                    // live count below (StatusManager refreshes by name).
                    for (const status of Array.from(member.character.statusManager.statuses.values())) {
                        if (status.definition.name === 'Crew') {
                            member.character.statusManager.removeStatusInstance(status.id);
                        }
                    }
                    if (member.character.jobId === config.jobId && count > 0) {
                        applyStatus(member.character, crewStatus(count, config.attackPerMember));
                    }
                }
            }
        }
    }

    /** Battle-scoped state cleanup and equipment restoration registry. */
    private restoreCallbacks: Array<() => void> = [];
    private disposed = false;

    /** Registers a battle-end restoration (e.g. a disarmed weapon). */
    registerBattleRestore(callback: () => void): void {
        this.restoreCallbacks.push(callback);
    }

    /**
     * Ends the battle's transient state: clears statuses (keeping
     * persistent ones) and restores detached equipment. Idempotent; every
     * battle driver must call it exactly once.
     */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        for (const combatant of this.combatants) {
            clearStatuses(combatant.character, { keepPersistent: true });
        }
        const callbacks = this.restoreCallbacks;
        this.restoreCallbacks = [];
        for (const callback of callbacks) callback();
    }

    /**
     * Weapon Disarm: detaches the target's primary weapon for the rest of
     * the battle and records its restoration. The item never reaches the
     * inventory; ownership counts stay untouched.
     */
    private disarmWeapons(targets: Character[]): void {
        for (const target of targets) {
            const weapon = this.primaryWeaponOf(target);
            if (!weapon) continue;
            if (weapon.hole >= 0) {
                const result = unequipHole(target, weapon.hole);
                if (!result.ok) continue;
                for (const removed of result.removed) {
                    this.registerBattleRestore(() => {
                        equipInto(target, weapon.hole, removed);
                    });
                }
            } else {
                target.equipment.unequip('weapon', target);
                this.registerBattleRestore(() => {
                    target.equipment.equipOrReplace(weapon.item, target);
                });
            }
        }
    }

    /** The first wielded weapon: lowest weapon hole, then the legacy slot. */
    private primaryWeaponOf(character: Character): { item: Item; hole: number } | undefined {
        const loadout = character.loadout;
        if (loadout) {
            for (let hole = 0; hole < loadout.holes.length; hole++) {
                const item = loadout.holes[hole];
                if (!item) continue;
                if (item.definition.loadoutSlot === 'weapon' || item.definition.slot === 'weapon') {
                    return { item, hole };
                }
            }
        }
        const legacy = character.equipment.get('weapon');
        if (legacy) return { item: legacy, hole: -1 };
        return undefined;
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
     * The skills a fighter knows right now: its base kit plus the
     * skills granted by its live statuses (Open Gate unlocks Fire
     * Breath), hiding activation skills whose status is already active.
     * Mana is NOT filtered here: the manual prompt lists every skill
     * and lets the UI disable the unaffordable ones (they stay visible
     * instead of disappearing).
     */
    private skillsOf(actor: HybridCombatant): SkillSpec[] {
        return battleSkillSpecs(actor.character, actor.skills ?? []);
    }

    /** The skills the fighter can pay for right now (auto planner):
     *  mana, hp share and the shield requirement all count. */
    private affordableSkillsOf(actor: HybridCombatant): SkillSpec[] {
        return this.skillsOf(actor).filter((spec) => canAffordSkill(spec, actor.character));
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

        const event = this.actOnce(actor);
        if (!event) return this.next();
        return event;
    }

    /**
     * The battle's winner once a side is wiped: 'left', 'right' or
     * 'draw'. Null while both sides still stand.
     */
    isOver(): HybridSide | 'draw' | null {
        return this.winner();
    }

    /** Whether a manual prompt is waiting for the player's answer. */
    hasPendingManual(): boolean {
        return this.pendingManual !== null;
    }

    /**
     * Resolves exactly ONE action of the given fighter (the Pokémon-
     * style step): the turn-start regen, the faint skip, and then
     * either the manual prompt (the player answers resolveManual /
     * resolveManualSkill) or the planned automatic action. Returns null
     * when the fighter is missing, dead or fainted — the caller steps
     * to the next actor. The tick-based next() stays available for the
     * auto battles.
     */
    resolveAction(actorId: string): HybridAutoEvent | HybridManualEvent | null {
        const actor = this.combatants.find((entry) => entry.character.id === actorId);
        if (!actor || actor.character.stats.hp <= 0) return null;
        return this.actOnce(actor);
    }

    /**
     * One fighter's action, shared by the tick loop and the step API:
     * the mana regen, the faint gate, and the manual prompt or the
     * planned automatic action.
     */
    private actOnce(actor: HybridCombatant): HybridAutoEvent | HybridManualEvent | null {
        // Per-owner turn moment first: statuses written for `on_turn`
        // (Defence Stand, Foot Shot, Impetu...) apply their stats and
        // decay here, like they do in the interval engine.
        actor.character.statusManager.trigger('on_turn');

        // Fainted fighters lose this action (their faint counts down).
        if (consumeFaintTurn(actor.character)) return null;

        // Stunned fighters lose this action too (the stun is consumed).
        if (consumeStunTurn(actor.character)) return null;

        // Turn start: the fighter regains mana (capped at the pool).
        // Skipped turns (faint/stun) do not regenerate.
        const totalMana = actor.character.stats.totalMana ?? 0;
        actor.character.stats.mana = Math.min(totalMana, (actor.character.stats.mana ?? 0) + MANA.regenPerTurn);

        if (actor.manual) {
            this.pendingManual = actor;
            return this.manualEvent(actor);
        }

        // Automatic fighter: the skill planner decides (skills first,
        // basic attack as the fallback). Unaffordable skills never
        // reach the planner: it may only pick what the fighter can pay.
        const plan = planAutoAction({
            actor: actor.character,
            allies: this.alliesOf(actor).map((entry) => entry.character),
            enemies: this.enemiesOf(actor).map((entry) => entry.character),
            skills: this.affordableSkillsOf(actor),
            cooldowns: this.cooldownsOf(actor.character.id),
            meters: this.metersOf(actor.character.id),
            sharedCooldowns: this.sharedCooldownsOf(actor.side),
            random: this.random,
        });

        if (plan.kind === 'attack') {
            const target = this.enemiesOf(actor).find(
                (entry) => entry.character.id === plan.targetId,
            );
            if (!target) return null;
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
     * fighter's skills. Without targetIds the engine plans the targets
     * itself (the spec's targeting); with them, the player's picks are
     * used (single or multi-target skills). Manual skill use ignores
     * auto policies and cooldowns: the player decides.
     */
    resolveManualSkill(skillId: string, targetIds?: string | string[]): HybridAutoEvent | null {
        if (!this.pendingManual) return null;
        const actor = this.pendingManual;
        const spec = this.skillsOf(actor).find((entry) => entry.id === skillId);
        if (!spec) return null;
        // The fighter must be able to use the skill: mana, hp share and
        // the shield requirement (the UI disables it; this keeps the
        // engine honest regardless).
        if (!canAffordSkill(spec, actor.character)) return null;
        this.pendingManual = null;
        let picked: string[] = [];
        if (targetIds !== undefined) {
            const ids = Array.isArray(targetIds) ? targetIds : [targetIds];
            // Every pick must be a living fighter of this battle.
            const allValid = ids.every((id) => this.combatants.some(
                (entry) => entry.character.id === id && entry.character.stats.hp > 0,
            ));
            if (!allValid) return null;
            picked = ids;
        } else {
            picked = pickSkillTargets(
                spec,
                actor.character,
                this.alliesOf(actor).map((entry) => entry.character),
                this.enemiesOf(actor).map((entry) => entry.character),
                this.random,
            );
        }
        return this.performSkill(actor, spec, picked);
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
        // The skill spends its mana on cast (free skills cost nothing).
        const cost = spec.manaCost ?? 0;
        if (cost > 0) {
            actor.character.stats.mana = Math.max(0, (actor.character.stats.mana ?? 0) - cost);
        }
        // The hp share: a percent of the user's TOTAL hp, paid from its
        // current hp (at least 1 hp survives — the gate refuses the
        // cast otherwise).
        const hpShare = hpCostOf(spec, actor.character);
        if (hpShare > 0) {
            actor.character.stats.hp = Math.max(1, actor.character.stats.hp - hpShare);
            actor.character.stats.isAlive = 1;
        }

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
        if (spec.disarmWeapon) this.disarmWeapons(targets);

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

/** The SkillSpecs a character knows (own skills plus job-ladder skills at
 *  their current level). Passives are included: the engine applies their
 *  battle-start statuses and the menus filter them out. */
function skillSpecsOf(session: WorldSession, character: Character): SkillSpec[] {
    const specs: SkillSpec[] = [];
    for (const id of session.availableSkillIds(character)) {
        const spec = specForSkill(character, id);
        if (spec) specs.push(spec);
    }
    return specs;
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
            session.team.getCharacter(fight.manualId) ??
            session.roster.character(fight.manualId) ??
            session.findNpc(fight.manualId)?.character;
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

    // The enemies: the camp's own people when the fight names them
    // (the sparring matches), otherwise the generated roster.
    const namedEnemies = (fight.enemyIds ?? [])
        .map((id) => session.findNpc(id)?.character)
        .filter((character): character is Character => Boolean(character));
    const enemyPool = namedEnemies.length > 0 ? namedEnemies : fight.enemies();
    const right: HybridCombatant[] = enemyPool.map((enemy) => ({
        character: enemy,
        interval: intervalFromSpeed(enemy.getStat('speed')),
        side: 'right',
        skills: skillSpecsOf(session, enemy),
    }));

    return {
        combat: new HybridCombat([...left, ...right], options),
        allies,
        enemies: enemyPool,
    };
}
