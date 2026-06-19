
export type DamageType =
    | "physical"
    | "piercing"
    | "fire"
    | "ice"
    | "lightning"
    | "heal"
    | "poison";

export interface DamagePacket {
    type: DamageType;

    amount: number;

    source?: string;


}

