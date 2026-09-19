import { Character } from '../Character';

export type IntervalCombatSide = 'left' | 'right';

export type IntervalCombatant = {
    character: Character;
    // Acts whenever the global tick index is a multiple of this interval
    // (interval 3 acts on 3, 6, 9...). Smaller intervals act more often.
    interval: number;
};

export type IntervalCombatTurn = {
    tick: number;
    actorId: string;
    targetId: string;
    damageApplied: number;
    targetHpAfter: number;
    targetAlive: boolean;
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
};

const DEFAULT_OPTIONS: Required<IntervalCombatOptions> = {
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
    private options: Required<IntervalCombatOptions>;

    constructor(options: IntervalCombatOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    resolve(
        left: IntervalCombatant[],
        right: IntervalCombatant[],
        options: IntervalCombatOptions = {},
    ): IntervalCombatResult {
        const config = { ...this.options, ...options };

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

                const defenders = side === 'left' ? alive(right) : alive(left);
                if (defenders.length === 0) break;

                const target = this.pickTarget(defenders, config);
                const damage = this.resolveAttack(actor.character, target.character);

                turns.push({
                    tick,
                    actorId: actor.character.id,
                    targetId: target.character.id,
                    damageApplied: damage,
                    targetHpAfter: target.character.stats.hp,
                    targetAlive: target.character.stats.hp > 0,
                });
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

    private resolveAttack(attacker: Character, defender: Character): number {
        const damage = Math.max(0, attacker.getStat('attack') - defender.getStat('defence'));
        defender.stats.hp = Math.max(0, defender.stats.hp - damage);
        defender.stats.isAlive = defender.stats.hp > 0 ? 1 : 0;
        return damage;
    }

    private pickTarget(
        defenders: IntervalCombatant[],
        config: Required<IntervalCombatOptions>,
    ): IntervalCombatant {
        if (!config.randomTarget || defenders.length === 1) {
            return defenders[0];
        }
        return defenders[Math.floor(config.random() * defenders.length)];
    }
}
