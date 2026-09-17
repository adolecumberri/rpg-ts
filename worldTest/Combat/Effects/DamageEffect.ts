import { CombatContext } from "../../../src/classes/Combat/Combat.interfaces";
import { DamagePacket } from "../../../src/classes/Combat/DamagePacket";
import { EffectTargeting, SkillEffect } from "../../../src/classes/Skills";
import { TargetSubsetResolver } from "../../../src/classes/Combat/TargetSubsetResolver";

export class DamageEffect implements SkillEffect {

    constructor(
        public amount: number,
        public type: DamagePacket["type"],
        public targeting: EffectTargeting = "ALL",
        public amountOfTargets = 1
    ) { }

    execute(context: CombatContext) {

        const selectedTargetsEffects =
            TargetSubsetResolver.resolve(
                context.targetEffects,
                context.attacker,
                this.targeting,
                this.amountOfTargets
            );

        for (const target of selectedTargetsEffects) {


            target.damagePackets.push({
                amount: this.amount,
                type: this.type
            });
        }
    }
}