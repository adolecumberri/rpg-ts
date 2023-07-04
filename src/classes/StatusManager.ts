
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
      this.statusList = this.statusList.concat(status);
    } else {
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

  removeStatusById(id: number) {
    this.statusList = this.statusList.filter((status) => {
      if (status.id === id) {
        status.recover(this.character);
        return false;
      } else {
        return true;
      }
    });
  }

  removeAllStatuses() {
    this.statusList = [];
    this.recoverAll();
  }

  recoverAll(): void {
    for (const status of this.statusList) {
      status.recover(this.character);
    }
  }
}

export default StatusManager;

export {
  StatusManager,
};

