import { Character } from "../Character";
import { Skill } from "../Skills";
import { Team } from "../Team";
import { CombatContext } from "./Combat.interfaces";
import { DamageResolver } from "./DamageResolver";
import { TargetResolver } from "./TargetResolver";


export class CombatEngine {
    executeSkill(params: {
        skill: Skill;
        attacker: Character;
        allies: Team;
        enemies: Team;
        explicitTargets?: Character[];
    }) {
        const { skill, attacker, allies, enemies, explicitTargets } = params;

        const targets = TargetResolver.resolve(
            skill,
            attacker,
            allies,
            enemies,
            explicitTargets
        );

        console.log({
            explicitTargets: explicitTargets,
            targets
        });

        const context = {
            attacker,
            targets,
            damagePackets: []
        }

        console.log({
            context,
        });

        // 1. run effects
        for (const effect of skill.effects) {
            effect.execute(context);
        }

        console.log(context.damagePackets);
        // 2. apply damage
        DamageResolver.apply(context);

        // 3. trigger statuses
        for (const target of targets) {
            target.statusManager.trigger("on_action");
        }
    }
}