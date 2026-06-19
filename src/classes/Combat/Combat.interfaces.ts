import { EventMoment } from "../../types/generalEvents.types";
import { Character } from "../Character";
import { DamagePacket } from "./DamagePacket";

export interface CombatAction {
    source: Character;

    targets: Character[];

    effects: DamagePacket[];
}

export interface CombatContext {
    attacker: Character;

    targets: Character[];

    damagePackets: DamagePacket[];
}

export interface CombatTrigger {

    event: EventMoment;

    execute(
        context: CombatContext
    ): void | Promise<void>;
}