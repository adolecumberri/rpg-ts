import { CombatContext } from "../../../src/classes/Combat/Combat.interfaces";
import { SkillEffect } from "../../../src/classes/Skills";
import { StatusDefinition, StatusInstance } from "../../../src/classes/StatusInstance";

export class ApplyStatusEffect implements SkillEffect {

    constructor(
        public statusDefinition: StatusDefinition 
    ) { }

    execute(
        context: CombatContext
    ) {
        for (const targetEffect of context.targetEffects) {

            targetEffect.statusEffects.push(
                new StatusInstance({
                    definition: this.statusDefinition,
                    timesTriggered: 0,
                    timesUsed: 0
                })
            );
        }
    }

}