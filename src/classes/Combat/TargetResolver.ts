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

            case "ENEMY":
                if (explicitTargets) {
                    solution.push(...explicitTargets);
                }
                break;

            case "RANDOM_ENEMY":
                if (enemies.members.size > 0) {
                    const randomIndex = Math.floor(Math.random() * enemies.members.size);
                    solution.push(enemies.getAll()[randomIndex]);
                }
                break;

            case "ALL_ENEMIES":
                solution.push(...enemies.getAll());
                break;

            case "ALL_ALLIES":
                solution.push(...allies.getAll());
                break;

            case "RANDOM":
                const allCharacters = [...allies.getAll(), ...enemies.getAll()];
                if (allCharacters.length > 0) {
                    const randomIndex = Math.floor(Math.random() * allCharacters.length);
                    solution.push(allCharacters[randomIndex]);
                }
                break;

            case "ALL":
                solution.push(...allies.getAll(), ...enemies.getAll());
                break;

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