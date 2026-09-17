import { Character } from '../Character';
import { Skill } from '../Skills';
import { Team } from '../Team';


export class TargetResolver {
    static resolve(
        skill: Skill,
        attacker: Character,
        allies: Team,
        enemies: Team,
        explicitTargets?: Character[],
    ): Character[] {
        const solution = [] as Character[];
        switch (skill.targeting) {
        case 'SELF':
            solution.push(attacker);
            break;

            // TODO check if this is the way
        case 'ENEMY':
            if (explicitTargets) {
                solution.push(...explicitTargets);
            }
            break;

        case 'RANDOM_ENEMY': {
            const alive = enemies.getAlive();
            if (alive.length > 0) {
                solution.push(alive[Math.floor(Math.random() * alive.length)]);
            }
            break;
        }

        case 'ALL_ENEMIES':
            solution.push(...enemies.getAlive());
            break;

        case 'ALL_ALLIES':
            solution.push(...allies.getAlive());
            break;

        case 'RANDOM':
            const allCharacters = [...allies.getAlive(), ...enemies.getAlive()];
            if (allCharacters.length > 0) {
                const randomIndex = Math.floor(Math.random() * allCharacters.length);
                solution.push(allCharacters[randomIndex]);
            }
            break;

        case 'ALL':
            solution.push(...allies.getAlive(), ...enemies.getAlive());
            break;

            // TODO: check if this is the way
        case 'ALLY':
            if (explicitTargets) {
                solution.push(...explicitTargets);
            }
            break;

        case 'RANDOM_ALLY': {
            const alive = allies.getAlive();
            if (alive.length > 0) {
                solution.push(alive[Math.floor(Math.random() * alive.length)]);
            }
            break;
        }

        default:
            throw new Error(`Targeting type ${skill.targeting} not implemented yet.`);
        }

        // TODO: Ampliar.
        return solution;
    }
}
