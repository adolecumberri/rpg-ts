import { CombatContext } from "../../../src/classes/Combat/Combat.interfaces";
import { TargetSubsetResolver } from "../../../src/classes/Combat/TargetSubsetResolver";
import { EffectTargeting, SkillEffect } from "../../../src/classes/Skills";
import { StatusDefinition, StatusInstance } from "../../../src/classes/StatusInstance";

//Class used for DOT y HOT effects
export class ApplyStatusEffect implements SkillEffect {

    constructor(
        public statusDefinition: StatusDefinition,
        public targeting: EffectTargeting = "ALL",
        public amountOfTargets = 1
    ) { }


    execute(
        context: CombatContext
    ) {
        const selectedTargetsEffects =
            TargetSubsetResolver.resolve(
                context.targetEffects,
                context.attacker,
                this.targeting,
                this.amountOfTargets
            );

        for (const target of selectedTargetsEffects) {

            target.statusEffects.push(
                new StatusInstance({
                    definition: this.statusDefinition,
                    timesTriggered: 0,
                    timesUsed: 0
                })
            );
        }
    }

}