
import { Skill } from "../../src/classes/Skills";
import { StatusInstance } from "../../src/classes/StatusInstance";
import { ApplyStatusEffect } from "./Effects/ApplyStatus";
import { DamageEffect } from "./Effects/Damage";

export const SKILLS: Record<string, Skill> = {
    fireball: {
        id: "fireball",
        name: "Fireball",

        targeting: "RANDOM_ENEMY",
        numberOfTargets: 3,

        effects: [
            new DamageEffect(
                40,
                "fire"
            )
        ]
    },
    poisonStrike: {
        id: "poisonStrike",
        name: "Poison Strike",

        targeting: "ENEMY",
        numberOfTargets: 1,
        effects: [
            new DamageEffect(
                20,
                "physical"
            ),

            new ApplyStatusEffect(
                new StatusInstance({
                    definition: {
                        applyOn: "on_turn",
                        duration: {
                            type: "TEMPORAL",
                            value: 3
                        },
                        usageFrequency: "PER_ACTION",
                        statsAffected: [
                            {
                                value: 5,
                                typeOfModification: "DEBUFF_PERCENTAGE",
                                from: "totalHp",
                                to: "hp",
                            }
                        ],
                        name: "Poisoned",
                    }
                })
            )
        ]
    },
    basicAttack: {
        id: "basicAttack",
        name: "Basic Attack",
        targeting: "ENEMY",
        numberOfTargets: 1,
        effects: [
            new DamageEffect(
                10,
                "physical"
            )
        ]
    }
}