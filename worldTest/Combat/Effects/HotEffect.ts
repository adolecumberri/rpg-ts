import { CombatContext } from "../../../src/classes/Combat/Combat.interfaces";
import { DamagePacket } from "../../../src/classes/Combat/DamagePacket";
import { TargetSubsetResolver } from "../../../src/classes/Combat/TargetSubsetResolver";
import { EffectTargeting, SkillEffect } from "../../../src/classes/Skills";
import { StatusInstance } from "../../../src/classes/StatusInstance";
import { DamageEffect } from "./DamageEffect";

export class HotEffect implements SkillEffect {

    constructor(
        public amount: number,
        public duration: number,
        public healType?: "heal",
        public targeting: EffectTargeting = "ALL"
    ) { }

    execute(context: CombatContext) {

        const targets =
            TargetSubsetResolver.resolve(
                context.targetEffects,
                context.attacker,
                this.targeting
            );

        for (const target of targets) {

            target.statusEffects.push(
                new StatusInstance({
                    definition: {
                        name: "Poison",
                        applyOn: "on_turn",

                        duration: {
                            type: "TEMPORAL",
                            value: 3
                        },

                        usageFrequency: "PER_ACTION",

                        statsAffected: [],

                    }
                })
            );

        }

    }

}