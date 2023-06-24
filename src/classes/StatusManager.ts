
import { STATUS_DURATIONS } from '../constants';
import { StatusApplicationMoment, StatusManagerConstructor } from '../types';
import Character from './Character';
import Status from './Status';

class StatusManager {
  statusList: Status[] = [];
  character: Character;

  constructor(con?: StatusManagerConstructor) {
    con && Object.assign(this, con);
  }

  addStatus(status: Status[] | Status) {
    if (Array.isArray(status)) {
      this.statusList = this.statusList.concat(status);
    } else {
      this.statusList.push(<Status>status);
    }
  }

  activate(applyOn: StatusApplicationMoment) {
    this.statusList.forEach((status) => {
      if (status.applyOn === applyOn) {
        status.activate(this.character);
        if (status.duration.type === STATUS_DURATIONS.TEMPORAL && status.duration.value === 0) {
          this.removeStatusById(status.id);
        }
      }
    });
  }

  removeStatusById(id: number) {
    this.statusList = this.statusList.filter((status) => status.id !== id);
  }
}

export default StatusManager;
