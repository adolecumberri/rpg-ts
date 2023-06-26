import { Team } from '../classes';

type TeamConstructor = Partial<Team> & Record<string, any>

export {
  TeamConstructor,
};
