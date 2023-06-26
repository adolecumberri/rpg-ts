
import { STATUS_DURATIONS } from '../constants';
import { DynamicStatusManagerConstructor, StatusApplicationMoment, StatusManagerConstructor } from '../types';
import { Character, Status } from './';

class BaseStatusManager {
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
        status.activate(this.character);
        status.hasBeenUsed = true;
        if (status.duration.type === STATUS_DURATIONS.TEMPORAL && status.duration.value === 0) {
          this.removeStatusById(status.id);
        }
      }
    });
  }

  removeStatusById(id: number) {
    this.statusList = this.statusList.filter((status) => status.id !== id);
  }

  removeAllStatuses() {
    this.statusList = [];
  }

  recoverAll(): void {
    for (const status of this.statusList) {
      status.recover(this.character);
    }
  }
}

// con esto evito tener que usar typeof Status cada vez que lo uso fuera.
const StatusManager = BaseStatusManager as DynamicStatusManagerConstructor
type StatusManager = InstanceType<typeof BaseStatusManager>

export default StatusManager;

export {
  StatusManager,
  BaseStatusManager
};

