/* eslint-disable max-len */
import {DEFENCE_TYPE} from '../constants/types';
import {AttackObject, DefenceObject} from '../interfaces';
import {Constructor} from '../interfaces/LogManager.Interface';
import {defaultCharacter} from './Character';
import Status from './Status';


class LogManager {
  logs: string[] = [];

  logCounts: number = 0;
  constructor(constructor?: Constructor) {
    constructor && Object.assign(this, constructor);
  }

  addLog(newLog: string, character: defaultCharacter) {
    this.logs.push(this.getLogHeader(character) + newLog);
  }

  addLogFromAttackObject(attObj: AttackObject, character: defaultCharacter) {
    this.logs.push(this.getLogHeader(character) + `${attObj.value} on ${attObj.type.toLocaleUpperCase()} hit.`);
  }

  addLogFromDefenceObject(defObj: DefenceObject, character: defaultCharacter) {
    let logBody = '';
    if (defObj.type.toLocaleUpperCase() === DEFENCE_TYPE.EVASION) {
      logBody = 'attack evaded';
    } else if (defObj.type.toLocaleUpperCase() === DEFENCE_TYPE.NORMAL) {
      logBody = `DAMAGE(${defObj.value}) dealt after attack. `;
    } else {
      logBody = `value: ${defObj.value} - defence type: ${defObj.type.toLocaleUpperCase()} `;
    }

    logBody += `with DEFENCE=${character.stats.defence} and EVASION=${character.stats.evasion}`;

    this.logs.push(this.getLogHeader(character) + logBody);
  }

  addLogStatus(status: Status, action: 'added' | 'removed', character: defaultCharacter) {
    let solution = this.getLogHeader(character);
    solution += ` ${action === 'added' ? 'adds' : 'removes'} ${
      status.name.toUpperCase()
    } (id:${status.id}) from his Status List`;

    this.logs.push(solution);
  }

  getLogHeader( character: defaultCharacter) {
    const d = new Date();
    const formattedDate = `${d.getDay()}/${d.getMonth()}/${d.getFullYear()} - ${d.getMinutes() + 1}:${d.getHours() + 1}`;
    return `${++this.logCounts}.${formattedDate} - ${character.name ? character.name.toUpperCase() : 'character'} (id:${character.id}): `;
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
