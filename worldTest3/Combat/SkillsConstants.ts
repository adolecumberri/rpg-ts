
import { Skill } from "../../src/classes/Skills";
import { StatusInstance } from "../../src/classes/StatusInstance";
import { ApplyStatusEffect } from "./Effects/ApplyStatusEffect";
import { DamageEffect } from "./Effects/DamageEffect";

type skillNames = "fireball" | "poisonStrike" | "basicAttack" | "groupHeal";
export const SKILLS: Record<skillNames, Skill> = {
    fireball: {
        id: "fireball",
        name: "Fireball",

        targeting: "ENEMY",
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

            new ApplyStatusEffect({
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
            })
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
    },
    groupHeal: {
        id: "groupHeal",
        name: "Regeneration",

        targeting: "ALL_ALLIES",

        effects: [
            new ApplyStatusEffect(
                {
                    name: "Regeneration",

                    applyOn: "on_turn",

                    duration: {
                        type: "TEMPORAL",
                        value: 3
                    },

                    usageFrequency: "PER_ACTION",

                    statsAffected: [
                        {
                            from: "totalHp",
                            to: "hp",
                            value: 10,
                            typeOfModification: "BUFF_PERCENTAGE"
                        }
                    ]
                },
            )
        ]
    }
};