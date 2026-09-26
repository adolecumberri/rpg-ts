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
// Ignored for subject 'self'. Status conditions only support 'any'
// and 'all'.
export type ConditionMatch = 'any' | 'all' | 'lowest' | 'highest';

// A status the examined members may carry: by polarity (positive =
// buff, negative = debuff/ailment) and/or by exact name. Both set =
// both must match.
export type StatusPredicate = {
    polarity?: 'positive' | 'negative';
    name?: string;
};

export type AutoCondition = {
    // Identifier for logs and the dev page (required in the registry).
    id?: string;
    // Whose team is examined.
    subject: ConditionSubject;
    // Which members must satisfy the comparison (default 'any').
    match?: ConditionMatch;
    // ---- Stat comparison (exclusive with hasStatus) ----
    // Any stat name: 'hp', 'mana', 'speed'...
    stat?: string;
    compare?: 'over' | 'below';
    value?: number;
    // fixed: compare the raw stat value. percent: compare against the
    // stat's total (hp -> totalHp, mana -> totalMana...).
    valueType?: 'fixed' | 'percent';
    // ---- Status check (exclusive with the stat comparison) ----
    // Whether the examined members carry such a status.
    hasStatus?: StatusPredicate;
    // Inverts the outcome: 'no enemy carries a debuff' becomes
    // checkable with hasStatus + negate.
    negate?: boolean;
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
    const hasStat = condition.stat !== undefined;
    const hasStatus = condition.hasStatus !== undefined;
    if (hasStat === hasStatus) {
        return 'A condition needs exactly one of `stat` or `hasStatus`.';
    }

    if (hasStatus) {
        if (condition.hasStatus!.polarity !== undefined
            && ['positive', 'negative'].indexOf(condition.hasStatus!.polarity) === -1) {
            return `Unknown status polarity: ${condition.hasStatus!.polarity}.`;
        }
        if ((condition.match ?? 'any') !== 'any' && condition.match !== 'all') {
            return `Status conditions only support 'any' and 'all'.`;
        }
        return null;
    }

    if (condition.compare !== 'over' && condition.compare !== 'below') {
        return `Unknown compare: ${condition.compare}.`;
    }
    if (condition.valueType !== 'fixed' && condition.valueType !== 'percent') {
        return `Unknown valueType: ${condition.valueType}.`;
    }
    if (condition.value === undefined || !Number.isFinite(condition.value)) {
        return `Condition value must be a number.`;
    }
    if (!(condition.stat! in DEFAULT_STATS)) {
        return `Unknown stat '${condition.stat}' in condition.`;
    }
    if (condition.valueType === 'percent' && !totalStatOf(condition.stat!)) {
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

    if (condition.hasStatus) {
        const carries = (character: Character): boolean => {
            for (const status of character.statusManager.statuses.values()) {
                const polarity = condition.hasStatus!.polarity;
                const name = condition.hasStatus!.name;
                if (polarity !== undefined && status.definition.polarity !== polarity) continue;
                if (name !== undefined && status.definition.name !== name) continue;
                return true;
            }
            return false;
        };
        const matched = condition.match === 'all' ? alive.every(carries) : alive.some(carries);
        return condition.negate ? !matched : matched;
    }

    const values = alive.map((character) => conditionValue(character, condition));
    const passes = (value: number) =>
        condition.compare === 'over' ? value > condition.value! : value < condition.value!;

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
    const totalStat = totalStatOf(condition.stat!);
    if (!totalStat) return 0; // rejected by validateCondition
    const total = character.getStat(totalStat as keyof typeof DEFAULT_STATS);
    const current = character.getStat(condition.stat as keyof typeof DEFAULT_STATS);
    return total > 0 ? (current / total) * 100 : 0;
}

/** Human text for the dev page and battle logs, e.g. 'lowest ally hp below 25%'. */
export function describeCondition(condition: AutoCondition): string {
    const subject = condition.subject;
    const match = condition.subject === 'self' ? '' : `${condition.match ?? 'any'} `;
    if (condition.hasStatus) {
        const predicate = condition.hasStatus;
        const label = predicate.name
            ? `'${predicate.name}'`
            : `${predicate.polarity ?? ''} status${predicate.polarity ? 'es' : ''}`.trim();
        return `${match}${subject} ${condition.negate ? 'without' : 'with'} ${label}`;
    }
    return `${match}${subject} ${condition.stat} ${condition.compare} ${condition.value}${condition.valueType === 'percent' ? '%' : ''}`;
}
