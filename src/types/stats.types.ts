
type AnyStat = string; // Attack, HP, Mana, etc.

type StatModifierType = 'FIXED' | 'PERCENTAGE';

interface StatModifier {
    type: StatModifierType;
    value: number;
}

export {
    StatModifierType,
    StatModifier,
    AnyStat,
};
