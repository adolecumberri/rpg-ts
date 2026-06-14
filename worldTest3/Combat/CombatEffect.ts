export type CombatEffectType =
    | "physical"
    | "piercing"
    | "fire"
    | "ice"
    | "lightning"
    | "heal"
    | "poison";

export interface CombatEffect {
    type: CombatEffectType;

    value: number;

    source?: string;
}
