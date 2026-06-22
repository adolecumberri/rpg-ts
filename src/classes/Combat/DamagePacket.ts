import { Character } from "../Character";

export type DamageType =
    | "physical"
    | "piercing"
    | "fire"
    | "ice"
    | "lightning"
    | "heal"
    | "poison";

export interface DamagePacket {
    amount: number;

    type: DamageType;

    source?: string;

    attacker?: Character;

    target?: Character;

    canCrit?: boolean;

    ignoreDefence?: boolean;
}

