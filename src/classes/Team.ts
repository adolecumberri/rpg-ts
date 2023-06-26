import { DynamicTeamConstructor, TeamConstructor } from '../types';
import Character from './Character';

class BaseTeam {
  id: number;
  members: Character[];

  constructor(con?: TeamConstructor) {
    con && Object.assign(this, con);
    this.members = this.members || [];
  }

  addMember<T extends Character>(character: T): void {
    this.members.push(character);
  }

  removeMemberById(id: number): void {
    this.members = this.members.filter((character) => character.id !== id);
  }

  removeMember<T extends Character>(character: T): void {
    this.removeMemberById(character.id);
  }

  getAliveMembers(): Character[] {
    return this.members.filter((character) => character.isAlive);
  }

  isTeamAlive(): boolean {
    return this.getAliveMembers().length > 0;
  }

  getDeadMembers(): Character[] {
    return this.members.filter((character) => !character.isAlive);
  }
}

// con esto evito tener que usar typeof Status cada vez que lo uso fuera.
const Team = BaseTeam as DynamicTeamConstructor;
type Team = InstanceType<typeof BaseTeam>

export default Team;

export {
  Team,
  BaseTeam,
};
