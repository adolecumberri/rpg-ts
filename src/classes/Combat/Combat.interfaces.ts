import { EventMoment } from "../../types/generalEvents.types";
import { Character } from "../Character";
import { Skill } from "../Skills";
import { StatusInstance } from "../StatusInstance";
import { DamagePacket } from "./DamagePacket";

export interface TargetEffect {
    target: Character; // "victima" del efecto

    damagePackets: DamagePacket[]; //daño 

    statusEffects: StatusInstance[]; // status
}

export interface CombatContext {

    attacker: Character;

    skill: Skill;

    targetEffects: TargetEffect[]; // paquetes que se le asignaran a cara objetivo

    logs: string[];
}

export interface CombatTrigger {

    event: EventMoment;

    execute(
        context: CombatContext
    ): void | Promise<void>;
}