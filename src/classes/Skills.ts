import { Character } from "./Character";
import { CombatContext } from "./Combat/Combat.interfaces";

export type EnemyTarget =
    | "ENEMY"
    | "ALL_ENEMIES"
    | "RANDOM_ENEMY";

export type AllyTarget =
    | "ALLY"
    | "ALL_ALLIES"
    | "RANDOM_ALLY"
    | "SELF";

export type OtherTarget = "ALL" | "RANDOM" | "SELF";


export type SkillTarget = EnemyTarget | AllyTarget | OtherTarget;

export interface Skill {
    id: string;
    name: string;
    description?: string;
    cost?: { mana?: number; hp?: number };
    effects: SkillEffect[];
    targeting: SkillTarget;
    numberOfTargets?: number;
    multipleSelections?: boolean;
}

export interface SkillEffect {
    execute(
        context: CombatContext
    ): void;
}