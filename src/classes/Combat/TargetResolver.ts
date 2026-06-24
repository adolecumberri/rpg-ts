import { Character } from "../Character";
import { Skill } from "../Skills";
import { Team } from "../Team";


export class TargetResolver {
    static resolve(
        skill: Skill,
        attacker: Character,
        allies: Team,
        enemies: Team,
        explicitTargets?: Character[]
    ): Character[] {
        let solution = [] as Character[];
        switch (skill.targeting) {

            case "SELF":
                solution.push(attacker);
                break;

            //TODO check if this is the way
            case "ENEMY":
                if (explicitTargets) {
                    solution.push(...explicitTargets);
                }
                break;

            case "RANDOM_ENEMY":
                if (enemies.members.size > 0) {
                    const randomIndex = Math.floor(Math.random() * enemies.getAlive().length);
                    solution.push(enemies.getAlive()[randomIndex]);
                }
                break;

            case "ALL_ENEMIES":
                solution.push(...enemies.getAlive());
                break;

            case "ALL_ALLIES":
                solution.push(...allies.getAlive());
                break;

            case "RANDOM":
                const allCharacters = [...allies.getAlive(), ...enemies.getAlive()];
                if (allCharacters.length > 0) {
                    const randomIndex = Math.floor(Math.random() * allCharacters.length);
                    solution.push(allCharacters[randomIndex]);
                }
                break;

            case "ALL":
                solution.push(...allies.getAlive(), ...enemies.getAlive());
                break;

            //TODO: check if this is the way
            case "ALLY":
                if (explicitTargets) {
                    solution.push(...explicitTargets);
                }
                break;

            case "RANDOM_ALLY":
                if (allies.members.size > 0) {
                    const randomIndex = Math.floor(Math.random() * allies.members.size);
                    solution.push(allies.getAll()[randomIndex]);
                }
                break;

            default:
                throw new Error(`Targeting type ${skill.targeting} not implemented yet.`);
        }

        // TODO: Ampliar.
        return solution;
    }

}