import { Character } from '../Character';
import { positionTauntMultiplier } from '../../constants/team.constants';

export type IntervalCombatSide = 'left' | 'right';

export type IntervalCombatant = {
    character: Character;
    // Acts whenever the global tick index is a multiple of this interval
    // (interval 3 acts on 3, 6, 9...). Smaller intervals act more often.
    interval: number;
    // Targets hit per action (default 1). An action with hits 3 picks
    // 3 distinct random defenders and resolves each hit independently
    // (the Ent's multi-hit).
    hits?: number;
    // Optional plug-in that replaces the basic attack of this fighter
    // with a custom action (a skill). Returning null falls back to the
    // basic attack. Additive: battles without it behave exactly as
    // before.
    actionResolver?: IntervalActionResolver;
};

export type IntervalCombatTurn = {
    tick: number;
    actorId: string;
    targetId: string;
    damageApplied: number;
    targetHpAfter: number;
    targetAlive: boolean;
    // Optional flavour from the damage resolver, e.g. 'crit ×2'.
    note?: string;
};

export type IntervalCombatResult = {
    winner: IntervalCombatSide | 'draw';
    ticks: number;
    turns: IntervalCombatTurn[];
    leftSurvivors: string[];
    rightSurvivors: string[];
};

export type IntervalCombatOptions = {
    maxTicks?: number;
    randomTarget?: boolean;
    // Injectable random source for deterministic tests.
    random?: () => number;
    // Delegates the damage math of every hit. When provided it replaces
    // the default flat `attack - defence` formula; it receives the
    // engine's random source so crits (or any variance) stay
    // deterministic under injected randomness.
    damageResolver?: IntervalDamageResolver;
};

// The outcome of resolving one hit through a damage resolver.
export type IntervalDamage = {
    // Final damage applied to the target.
    damage: number;
    // Optional flavour shown in logs, e.g. 'crit ×2' or 'parried!'.
    note?: string;
    // Damage reflected back to the attacker (reactions like Parry or
    // Spike Shield). Applied after the hit resolves.
    reflect?: number;
};

export type IntervalDamageResolver = (
    attacker: Character,
    defender: Character,
    random: () => number,
) => IntervalDamage;

// The battle state an action resolver sees when deciding a fighter's
// action on its tick.
export type IntervalActionContext = {
    // Alive fighters of the actor's side (the actor included).
    allies: Character[];
    // Alive fighters of the opposing side.
    enemies: Character[];
    // How many actions this actor has taken so far (1-based).
    actionCount: number;
    random: () => number;
};

// A custom action (a skill) an automatic fighter performs instead of
// its basic attack. Every hit resolves through the action's damage
// resolver (falling back to the engine's) and is applied like a normal
// hit, including the status moments.
export type IntervalAction = {
    // Targets hit by the action (picked weighted by taunt).
    targets: number;
    // Damage math of every hit; falls back to the engine's resolver.
    damageResolver?: IntervalDamageResolver;
    // Flat healing applied to the actor before the hits resolve.
    healSelf?: number;
    // Flavour shown in the log, e.g. the skill name.
    note?: string;
};

export type IntervalActionResolver = (
    actor: Character,
    context: IntervalActionContext,
) => IntervalAction | null;

type IntervalBaseOptions = Omit<IntervalCombatOptions, 'damageResolver'>;
type ResolvedOptions = Required<IntervalBaseOptions> & { damageResolver?: IntervalDamageResolver };

const DEFAULT_OPTIONS: Required<IntervalBaseOptions> = {
    maxTicks: 1000,
    randomTarget: true,
    random: Math.random,
};

/**
 * Alternative auto-combat based on attack intervals: a global tick
 * index increments and every combatant acts whenever the tick is a
 * multiple of its interval. When it acts it picks a valid target on
 * the other team, attacks, and waits until its next scheduled tick.
 */
export class IntervalCombat {
    private options: ResolvedOptions;

    constructor(options: IntervalCombatOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    resolve(
        left: IntervalCombatant[],
        right: IntervalCombatant[],
        options: IntervalCombatOptions = {},
    ): IntervalCombatResult {
        const config: ResolvedOptions = { ...this.options, ...options };

        for (const combatant of [...left, ...right]) {
            if (!Number.isFinite(combatant.interval) || combatant.interval < 1) {
                throw new Error(`Invalid interval for ${combatant.character.name}: ${combatant.interval}.`);
            }
        }

        const alive = (side: IntervalCombatant[]): IntervalCombatant[] =>
            side.filter((combatant) => combatant.character.stats.hp > 0);

        let leftAlive = alive(left);
        let rightAlive = alive(right);

        if (leftAlive.length === 0 || rightAlive.length === 0) {
            throw new Error('Both sides must have at least one alive combatant.');
        }

        const turns: IntervalCombatTurn[] = [];
        let tick = 0;
        const actionCounts = new Map<string, number>();

        while (tick < config.maxTicks && leftAlive.length > 0 && rightAlive.length > 0) {
            tick++;

            const actors = [
                ...leftAlive.map((combatant) => ({ combatant, side: 'left' as IntervalCombatSide })),
                ...rightAlive.map((combatant) => ({ combatant, side: 'right' as IntervalCombatSide })),
            ]
                .filter(({ combatant }) => tick % combatant.interval === 0)
                .sort((a, b) =>
                    a.combatant.interval - b.combatant.interval ||
                    a.combatant.character.id.localeCompare(b.combatant.character.id));

            for (const { combatant: actor, side } of actors) {
                // The actor may have died earlier in this same tick.
                if (actor.character.stats.hp <= 0) continue;

                // Statuses bound to 'on_turn' gate the action (stun-like
                // effects, e.g. fainting): triggering consumes one turn
                // of their duration, and while any remains the fighter
                // skips its action. No-op without such statuses.
                const gated = this.hasOnTurnStatus(actor.character);
                actor.character.statusManager.trigger('on_turn');
                if (gated) continue;

                const defenders = side === 'left' ? alive(right) : alive(left);
                if (defenders.length === 0) break;

                const actionCount = (actionCounts.get(actor.character.id) ?? 0) + 1;
                actionCounts.set(actor.character.id, actionCount);

                // A fighter may replace its basic attack with a custom
                // action (a skill). Null keeps the basic attack.
                const action = actor.actionResolver?.(actor.character, {
                    allies: alive(side === 'left' ? left : right).map((entry) => entry.character),
                    enemies: defenders.map((entry) => entry.character),
                    actionCount,
                    random: config.random,
                }) ?? null;

                if (action && action.healSelf && actor.character.stats.hp > 0) {
                    actor.character.stats.hp = Math.min(
                        actor.character.stats.totalHp,
                        actor.character.stats.hp + action.healSelf,
                    );
                    actor.character.stats.isAlive = 1;
                }

                const targets = action ? action.targets : actor.hits ?? 1;
                for (const target of this.pickTargets(defenders, targets, config)) {
                    const resolved = this.resolveHit(
                        actor.character,
                        target.character,
                        config,
                        action?.damageResolver,
                        action?.note,
                    );

                    turns.push({
                        tick,
                        actorId: actor.character.id,
                        targetId: target.character.id,
                        damageApplied: resolved.damage,
                        targetHpAfter: target.character.stats.hp,
                        targetAlive: target.character.stats.hp > 0,
                        note: resolved.note,
                    });
                }
            }

            leftAlive = alive(left);
            rightAlive = alive(right);
        }

        const leftSurvivors = leftAlive.map((combatant) => combatant.character.id);
        const rightSurvivors = rightAlive.map((combatant) => combatant.character.id);

        let winner: IntervalCombatResult['winner'] = 'draw';
        if (leftSurvivors.length > 0 && rightSurvivors.length === 0) winner = 'left';
        if (rightSurvivors.length > 0 && leftSurvivors.length === 0) winner = 'right';

        return { winner, ticks: tick, turns, leftSurvivors, rightSurvivors };
    }

    /**
     * Resolves one hit through the injected damage resolver (when given)
     * or the default flat formula, and applies the result to the
     * defender. In tick-based combat every landed attack also fires the
     * `after_attack` and `after_turn` status moments on the attacker and
     * the defender, so statuses like Bleeding tick after each attack.
     * With no statuses attached this is a no-op.
     */
    private resolveHit(
        attacker: Character,
        defender: Character,
        config: ResolvedOptions,
        overrideResolver?: IntervalDamageResolver,
        actionNote?: string,
    ): IntervalDamage {
        const resolved = overrideResolver ?
            overrideResolver(attacker, defender, config.random) :
            config.damageResolver ?
                config.damageResolver(attacker, defender, config.random) :
                { damage: this.resolveAttack(attacker, defender) };

        defender.stats.hp = Math.max(0, defender.stats.hp - resolved.damage);
        defender.stats.isAlive = defender.stats.hp > 0 ? 1 : 0;

        if (resolved.reflect && resolved.reflect > 0) {
            attacker.stats.hp = Math.max(0, attacker.stats.hp - resolved.reflect);
            attacker.stats.isAlive = attacker.stats.hp > 0 ? 1 : 0;
        }

        for (const character of [attacker, defender]) {
            character.statusManager.trigger('after_attack');
            character.statusManager.trigger('after_turn');
        }

        const notes = [resolved.note, actionNote].filter(Boolean).join(' ');
        return notes ? { ...resolved, note: notes } : resolved;
    }

    private resolveAttack(attacker: Character, defender: Character): number {
        return Math.max(0, attacker.getStat('attack') - defender.getStat('defence'));
    }

    /** Whether the character carries any status bound to 'on_turn'. */
    private hasOnTurnStatus(character: Character): boolean {
        for (const status of character.statusManager.statuses.values()) {
            if (status.definition.applyOn === 'on_turn') return true;
        }
        return false;
    }

    /**
     * The targeting weight of a defender: its `taunt` stat multiplied by
     * its formation row (front ×3, center ×2, back ×1). Missing or
     * non-positive taunt values fall back to 1 before the row multiplies
     * them, so everyone in the same row is still equally likely to be
     * hit unless content says otherwise.
     */
    private tauntOf(character: Character): number {
        const value = character.getStat('taunt');
        const base = Number.isFinite(value) && value > 0 ? value : 1;
        return base * positionTauntMultiplier(character.position);
    }

    /**
     * Picks `count` distinct defenders for a multi-hit action. With
     * random targeting the defenders are sampled without replacement,
     * weighted by their taunt: each alive defender is chosen with
     * probability taunt / (sum of the alive team's taunt), so a 6-taunt
     * defender among five (6+1+1+1+1) takes 6/10 of the hits. With
     * every taunt at 1 this is exactly the classic uniform pick.
     * Deterministic targeting takes the first ones in team order.
     */
    private pickTargets(
        defenders: IntervalCombatant[],
        count: number,
        config: ResolvedOptions,
    ): IntervalCombatant[] {
        const pool = [...defenders];
        const picked: IntervalCombatant[] = [];
        const amount = Math.min(Math.max(1, count), pool.length);

        for (let index = 0; index < amount; index++) {
            if (!config.randomTarget || pool.length === 1) {
                picked.push(pool[index]);
                continue;
            }
            const totalTaunt = pool.reduce(
                (sum, combatant) => sum + this.tauntOf(combatant.character),
                0,
            );
            let roll = config.random() * totalTaunt;
            let chosenIndex = pool.length - 1;
            for (let candidate = 0; candidate < pool.length; candidate++) {
                roll -= this.tauntOf(pool[candidate].character);
                if (roll < 0) {
                    chosenIndex = candidate;
                    break;
                }
            }
            picked.push(pool.splice(chosenIndex, 1)[0]);
        }

        return picked;
    }
}
