import { ActionRecord } from '.';
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

  cleanMembersActionRecord(): void {
    this.members.forEach((member) => {
      member.actionRecord = new ActionRecord();
    });
  }

  static deserialize<T extends Character>(data: string): Team<T> {
    const parsedData = JSON.parse(data);

    const team = new Team<T>({
      id: parsedData.id,
      name: parsedData.name,
      members: parsedData.members.map((memberData) => memberData.deserialize()), // Deserialize each member
      lastFightRecord: parsedData.lastFightRecord,
      everyFightRecord: parsedData.everyFightRecord,
    });

    return team;
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
    return this.lastFightRecord;
  }

  getEveryFightRecord(): Record<string, TotalActionRecord> {
    return this.everyFightRecord;
  }

  getMemberIds(): number[] {
    return this.members.map((character) => character.id);
  }

  getDeadMembers(): T[] {
    return this.members.filter((character) => !character.isAlive);
  }

  isTeamAlive(): boolean {
    return this.getAliveMembers().length > 0;
  }

  loadLastFightRecord(): void {
    const solution = {};
    this.members.forEach((character) => {
      solution[character.id] = character.actionRecord.getTotalStats(character);
    });
    this.lastFightRecord = solution;

    this.addLastFightRecordToEveryFightRecord();
  }

  serialize(): string {
    const serialized = {
      id: this.id,
      name: this.name,
      members: this.members.map((member) => member.serialize()), // Serialize each member
      lastFightRecord: this.lastFightRecord,
      everyFightRecord: this.everyFightRecord,
    };

    return JSON.stringify(serialized);
  }
}

export default Team;

export {
  Team,
};
