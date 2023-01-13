/* eslint-disable max-len */

import {DEFENCE_TYPE} from '../constants/types';
import {AttackObject, DefenceObject} from '../interfaces';
import {Constructor} from '../interfaces/LogManager.Interface';
import {CharacterClass} from './Character';
import Status from './Status';


class LogManager {
  character: CharacterClass;

  logs: string[] = [];

  logCounts: number = 0;
  constructor({character}: Constructor) {
    this.character = character;
  }

  addLog(newLog: string) {
    this.logs.push(this.getLogHeader() + newLog);
  }

  addLogFromAttackObject(attObj: AttackObject) {
    this.logs.push(this.getLogHeader() + `${attObj.value} on ${attObj.type.toLocaleUpperCase()} hit.`);
  }

  addLogFromDefenceObject(defObj: DefenceObject) {
    let logBody = '';
    if (defObj.type.toLocaleUpperCase() === DEFENCE_TYPE.EVASION) {
      logBody = 'attack evaded';
    } else if (defObj.type.toLocaleUpperCase() === DEFENCE_TYPE.NORMAL) {
      logBody = `DAMAGE(${defObj.value}) dealt after attack. `;
    } else {
      logBody = `value: ${defObj.value} - defence type: ${defObj.type.toLocaleUpperCase()} `;
    }

    logBody += `with DEFENCE=${this.character.stats.defence} and EVASION=${this.character.stats.evasion}`;

    this.logs.push(this.getLogHeader() + logBody);
  }

  addLogStatus(status: Status, action: 'added' | 'removed') {
    let solution = this.getLogHeader();
    solution += ` ${action === 'added' ? 'adds' : 'removes'} ${
      status.name.toUpperCase()
    } (id:${status.id}) from his Status List`;

    this.logs.push(solution);
  }

  getLogHeader() {
    const d = new Date();
    const formattedDate = `${d.getDay()}/${d.getMonth()}/${d.getFullYear()} - ${d.getMinutes() + 1}:${d.getHours() + 1}`;
    return `${++this.logCounts}.${formattedDate} - ${this.character.name ? this.character.name.toUpperCase() : 'character'} (id:${this.character.id}): `;
  }

  getLastLog() {
    return this.logs[this.logs.length - 1];
  }

  reset() {
    this.logs = [];
    this.logCounts = 0;
  }
}

export default LogManager;
