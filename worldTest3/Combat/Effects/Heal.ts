import { CombatContext } from "../../../src/classes/Combat/Combat.interfaces";
import { SkillEffect } from "../../../src/classes/Skills";

export class HealEffect implements SkillEffect {

    constructor(
        public amount: number
    ) { }

    execute(
        context: CombatContext
    ) {

    }
}