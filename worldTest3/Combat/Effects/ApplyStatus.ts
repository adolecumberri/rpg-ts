import { CombatContext } from "../../../src/classes/Combat/Combat.interfaces";
import { SkillEffect } from "../../../src/classes/Skills";
import { StatusInstance } from "../../../src/classes/StatusInstance";

export class ApplyStatusEffect implements SkillEffect {

    constructor(
        public status: StatusInstance
    ) { }

    execute(
        context: CombatContext
    ) {

    }
}