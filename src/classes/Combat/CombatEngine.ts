import { Character } from "../Character";
import { Skill } from "../Skills";
import { Team } from "../Team";
import { CombatContext } from "./Combat.interfaces";
import { DamageResolver } from "./DamageResolver";
import { StatusResolver } from "./StatusResolver";
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


        const context: CombatContext = {
            attacker,
            skill,
            logs: [],
            targetEffects: targets.map(target => ({
                target,
                damagePackets: [],
                statusEffects: []
            }))
        };

        for (const effect of skill.effects)
            effect.execute(context);

        DamageResolver.apply(context);

        StatusResolver.apply(context);
    }
}