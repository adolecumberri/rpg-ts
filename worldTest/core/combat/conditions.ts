import type { Character } from '../../../src';
import { DEFAULT_STATS } from '../../../src/constants/stats.constants';

// ---------------------------------------------------------------------------
// The condition system of the auto battle: skills carry conditions that
// decide when their auto use is eligible. One descriptor type + one pure
// evaluator covers the whole matrix (self/ally/enemy × any/all/lowest/
// highest × over/below × fixed/percent); content only writes data.
// ---------------------------------------------------------------------------

export type ConditionSubject = 'self' | 'ally' | 'enemy';

// Which members of the examined side must satisfy the comparison.
// Ignored for subject 'self'.
export type ConditionMatch = 'any' | 'all' | 'lowest' | 'highest';

export type AutoCondition = {
    // Identifier for logs and the dev page (required in the registry).
    id?: string;
    // Whose team is examined.
    subject: ConditionSubject;
    // Which members must satisfy the comparison (default 'any').
    match?: ConditionMatch;
    // Any stat name: 'hp', 'mana', 'speed'...
    stat: string;
    compare: 'over' | 'below';
    value: number;
    // fixed: compare the raw stat value. percent: compare against the
    // stat's total (hp -> totalHp, mana -> totalMana...).
    valueType: 'fixed' | 'percent';
};

// A condition inside a skill policy: an inline descriptor or a named
// reference into the AUTO_CONDITIONS registry.
export type ConditionInput = AutoCondition | { ref: string };

export type ConditionContext = {
    // The fighter whose action is being planned.
    actor: Character;
    // Alive fighters of the actor's side (the actor included).
    allies: Character[];
    // Alive fighters of the opposing side.
    enemies: Character[];
};

// Percent conditions compare against the total of the stat. Unknown
// stats have no known total: validateCondition rejects them so content
// errors surface at definition time instead of mid-battle.
const TOTAL_STATS: Record<string, string> = {
    hp: 'totalHp',
    mana: 'totalMana',
};

export function totalStatOf(stat: string): string | undefined {
    return TOTAL_STATS[stat];
}

/** Returns an error description, or null when the condition is valid. */
export function validateCondition(condition: AutoCondition): string | null {
    if (['self', 'ally', 'enemy'].indexOf(condition.subject) === -1) {
        return `Unknown condition subject: ${condition.subject}.`;
    }
    if (condition.compare !== 'over' && condition.compare !== 'below') {
        return `Unknown compare: ${condition.compare}.`;
    }
    if (condition.valueType !== 'fixed' && condition.valueType !== 'percent') {
        return `Unknown valueType: ${condition.valueType}.`;
    }
    if (!Number.isFinite(condition.value)) {
        return `Condition value must be a number.`;
    }
    if (!(condition.stat in DEFAULT_STATS)) {
        return `Unknown stat '${condition.stat}' in condition.`;
    }
    if (condition.valueType === 'percent' && !totalStatOf(condition.stat)) {
        return `Percent condition on '${condition.stat}' has no known total stat.`;
    }
    return null;
}

/**
 * Whether the condition holds for the current battle state. Throws on
 * malformed conditions (they must be rejected at definition time).
 */
export function evaluateCondition(condition: AutoCondition, context: ConditionContext): boolean {
    const error = validateCondition(condition);
    if (error) throw new Error(error);

    const members = condition.subject === 'self'
        ? [context.actor]
        : condition.subject === 'ally' ? context.allies : context.enemies;
    const alive = members.filter((character) => character.stats.hp > 0);
    if (alive.length === 0) return false;

    const values = alive.map((character) => conditionValue(character, condition));
    const passes = (value: number) =>
        condition.compare === 'over' ? value > condition.value : value < condition.value;

    switch (condition.match ?? 'any') {
        case 'all':
            return values.every(passes);
        case 'lowest':
            return passes(Math.min(...values));
        case 'highest':
            return passes(Math.max(...values));
        default:
            return values.some(passes);
    }
}

function conditionValue(character: Character, condition: AutoCondition): number {
    if (condition.valueType !== 'percent') {
        // The stat name is validated against DEFAULT_STATS; the cast
        // keeps the door open for future stats (mana...) added later.
        const value = character.getStat(condition.stat as keyof typeof DEFAULT_STATS);
        return Number.isFinite(value) ? value : 0;
    }
    const totalStat = totalStatOf(condition.stat);
    if (!totalStat) return 0; // rejected by validateCondition
    const total = character.getStat(totalStat as keyof typeof DEFAULT_STATS);
    const current = character.getStat(condition.stat as keyof typeof DEFAULT_STATS);
    return total > 0 ? (current / total) * 100 : 0;
}

/** Human text for the dev page and battle logs, e.g. 'lowest ally hp below 25%'. */
export function describeCondition(condition: AutoCondition): string {
    const subject = condition.subject;
    const match = condition.subject === 'self' ? '' : `${condition.match ?? 'any'} `;
    return `${match}${subject} ${condition.stat} ${condition.compare} ${condition.value}${condition.valueType === 'percent' ? '%' : ''}`;
}
