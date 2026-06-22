import { CombatContext } from "./Combat.interfaces";

export class StatusResolver {

    static apply(context: CombatContext) {

        for (const targetEffect of context.targetEffects) {

            for (const status of targetEffect.statusEffects) {

                targetEffect.target.statusManager.addStatusInstance(status);

            }

        }

    }

};
