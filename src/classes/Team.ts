import { uniqueID } from '../helpers';
import { TeamConstructor, TotalActionRecord } from '../types';
import Character from './Character';

class Team <T extends Character = Character> {
  id: number = uniqueID();
  name: string = 'Team';
  members: T[];

  lastFightRecord: Record<string, TotalActionRecord> = {}; // objeto con idCharacter: TotalActionRecord
  everyFightRecord: Record<string, TotalActionRecord> = {}; // objeto con sumatorio de idCharacter: TotalActionRecord

  constructor(con?: TeamConstructor) {
    con && Object.assign(this, con);
    this.members = this.members || [];
  }

  addLastFightRecordToEveryFightRecord(): void {
    Object.keys(this.lastFightRecord).forEach((characterId) => {
      if (!this.everyFightRecord[characterId]) {
        // si no existe el registro del character, lo crea
        this.everyFightRecord[characterId] = this.lastFightRecord[characterId];
      } else {
        // characterId Y stats se mantienen como al inicio.
        // si existe, suma los valores
        Object.keys(this.lastFightRecord[characterId].attacks).forEach((attackKey) => {
          this.everyFightRecord[characterId].attacks[attackKey] += this.lastFightRecord[characterId].attacks[attackKey];
        });

        Object.keys(this.lastFightRecord[characterId].defences).forEach((defenceKey) => {
          this.everyFightRecord[characterId].defences[defenceKey] += this.lastFightRecord[characterId].defences[defenceKey];
        });
      }
    });
  }

  addMember(character: T): void {
    this.members.push(character);
  }

  hasMember(character: T): boolean {
    return this.members.some((member) => member.id === character.id);
  }

  removeMemberById(id: number): void {
    this.members = this.members.filter((character) => character.id !== id);
  }

  removeMember(character: T): void {
    this.removeMemberById(character.id);
  }

  getAliveMembers(): T[] {
    return this.members.filter((character) => character.isAlive);
  }

  getLastFightRecord(): Record<string, TotalActionRecord> {
    const solution = {};
    this.members.forEach((character) => {
      solution[character.id] = character.actionRecord.getTotalStats(character);
    });
    this.lastFightRecord = solution;

    // añade el valor de lastFightRecord a everyFightRecord
   this.addLastFightRecordToEveryFightRecord();
    return solution;
  }

  getEveryFightRecord(): Record<string, TotalActionRecord> {
    return this.everyFightRecord;
  }

  getMemberIds(): number[] {
    return this.members.map((character) => character.id);
  }

  isTeamAlive(): boolean {
    return this.getAliveMembers().length > 0;
  }

  getDeadMembers(): T[] {
    return this.members.filter((character) => !character.isAlive);
  }
}

export default Team;

export {
  Team,
};
