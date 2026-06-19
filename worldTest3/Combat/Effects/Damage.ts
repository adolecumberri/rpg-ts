import { CombatContext } from "../../../src/classes/Combat/Combat.interfaces";
import { DamagePacket } from "../../../src/classes/Combat/DamagePacket";
import { SkillEffect } from "../../../src/classes/Skills";

export class DamageEffect implements SkillEffect {

    constructor(
        public amount: number,
        public damageType: DamagePacket["type"]
    ) { }

    execute(context: CombatContext) {

        context.damagePackets ??= [];

        context.damagePackets.push({
            type: this.damageType,
            amount: this.amount,
        });

    }
}