
import { STATUS_DURATIONS } from '../constants';
import { StatusApplicationMoment, StatusManagerConstructor } from '../types';
import { Character, Status } from './';

class StatusManager {
  statusList: Status[] = [];
  character: Character;

  constructor(con?: StatusManagerConstructor) {
    con && Object.assign(this, con);
  }

  addStatus<T extends Status>(status: T[] | T) {
    if (Array.isArray(status)) {
      status.forEach((s) => s.onAdd?.(this.character));
      this.statusList = this.statusList.concat(status);
    } else {
      status.onAdd?.(this.character);
      this.statusList.push(status);
    }
  }

  activate(applyOn: StatusApplicationMoment) {
    this.statusList.forEach((status) => {
      if (status.applyOn === applyOn) {
        if (status.duration.type === STATUS_DURATIONS.TEMPORAL && status.duration.value === 0) {
          this.removeStatusById(status.id);
        }
        status.activate(this.character);
        status.hasBeenUsed = true;
      }
    });
  }

  hasStatus(id: number): boolean {
    return this.statusList.some((status) => status.id === id);
  }

  removeStatusById(id: number) {
    this.statusList = this.statusList.filter((status) => {
      if (status.id === id) {
        status.recover(this.character);
        status.onRemove?.(this.character);
        return false;
      } else {
        return true;
      }
    });
  }

  removeStatusByName(name: string) {
    this.statusList = this.statusList.filter((status) => {
      if (status.name === name) {
        status.recover(this.character);
        status.onRemove?.(this.character);
        return false;
      } else {
        return true;
      }
    });
  }

  removeAllStatuses() {
    this.recoverAll();
    this.statusList = [];
  }

  recoverAll(): void {
    for (const status of this.statusList) {
      status.recover(this.character);
      status.onRemove?.(this.character);
    }
  }
}

export default StatusManager;

export {
  StatusManager,
};

