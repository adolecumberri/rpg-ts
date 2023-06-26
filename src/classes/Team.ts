import { TeamConstructor } from '../types';
import Character from './Character';

class Team {
  id: number;
  members: Character[];

  constructor(con?: TeamConstructor) {
    con && Object.assign(this, con);
    this.members = this.members || [];
  }

  addMember(character: Character): void {
    this.members.push(character);
  }

  removeMemberById(id: number): void {
    this.members = this.members.filter((character) => character.id !== id);
  }

  removeMember(character: Character): void {
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

export default Team;

export {
  Team,
};
