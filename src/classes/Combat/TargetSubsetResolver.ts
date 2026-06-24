import { Character } from "../Character";
import { EffectTargeting } from "../Skills";
import { TargetEffect } from "./Combat.interfaces";

export class TargetSubsetResolver {

    static resolve(
        targets: TargetEffect[],
        attacker: Character,
        targeting: EffectTargeting = "ALL",
        amount = 1
    ): TargetEffect[] {

        switch (targeting) {

            case "ALL":
                return targets;

            case "FIRST":
                return targets.slice(0, 1);

            case "LAST":
                return targets.slice(-1);

            case "SELF":
                return targets.filter(
                    t => t.target.id === attacker.id
                );
            case "RANDOM":
                return targets.length
                    ? [targets[Math.floor(Math.random() * targets.length)]]
                    : [];

            case "RANDOM_N":
                return [...targets]
                    .sort(() => Math.random() - 0.5)
                    .slice(0, amount);

            default:
                return targets;
        }
    }

}