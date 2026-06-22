import { CombatContext } from "../../../src/classes/Combat/Combat.interfaces";
import { DamagePacket } from "../../../src/classes/Combat/DamagePacket";
import { SkillEffect } from "../../../src/classes/Skills";

export class DamageEffect implements SkillEffect {

    constructor(
        public amount: number,
        public type: DamagePacket["type"]
    ) { }

    // esto mueve cada paquete a cada targetEffect, que luego será procesado por DamageResolver
    execute(context: CombatContext) {

        for (const targetEffect of context.targetEffects) {
            // TODO: do this pass-by-reference will be problematic?
            targetEffect.damagePackets.push(this);

        }

    }
}