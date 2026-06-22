import { Character } from "../classes/Character";
import { CombatContext, TargetEffect } from "../classes/Combat/Combat.interfaces";

export class CombatContextHelper {

    static getTargetEffect(
        context: CombatContext,
        target: Character
    ): TargetEffect {

        const result = context.targetEffects.find(
            t => t.target.id === target.id
        );

        if (!result) {
            throw new Error(
                `Missing TargetEffect for ${target.name}`
            );
        }

        return result;

    }

}