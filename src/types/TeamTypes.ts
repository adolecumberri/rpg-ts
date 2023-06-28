import { BaseTeam, Team } from '../classes';

type TeamConstructor = Partial<BaseTeam>

type DynamicTeamConstructor = {
    new <T extends object>(arg?: T): T & {
        [x in keyof BaseTeam]: BaseTeam[x]
    }
}


export {
  TeamConstructor,
  DynamicTeamConstructor,
};
