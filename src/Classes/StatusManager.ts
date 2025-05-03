import { Character } from './Character';
import Status from './Status';
import { STATUS_DURATIONS } from './Status/status.constants';
import { StatusApplicationMoment, StatusManagerConstructor } from './Status/status.types';


class StatusManager {
    statusList: Status[] = [];

    constructor(con?: StatusManagerConstructor) {
        con && Object.assign(this, con);
    }

    addStatus<T extends Status>(status: T[] | T, character: Character) {
        if (Array.isArray(status)) {
            status.forEach((s) => s.onAdd?.(character));
            this.statusList = this.statusList.concat(status);
        } else {
            status.onAdd?.(character);
            this.statusList.push(status);
        }
    }

    activate(applyOn: StatusApplicationMoment, character: Character) {
        this.statusList.forEach((status) => {
            if (status.applyOn === applyOn) {
                if (status.duration.type === STATUS_DURATIONS.TEMPORAL && status.duration.value === 0) {
                    this.removeStatusById(status.id, character);
                }
                status.activate(character);
                status.hasBeenUsed = true;
            }
        });
    }

    hasStatus(id: number): boolean {
        return this.statusList.some((status) => status.id === id);
    }

    removeStatusById(id: number, character: Character) {
        this.statusList = this.statusList.filter((status) => {
            if (status.id === id) {
                status.recover(character);
                status.onRemove?.(character);
                return false;
            } else {
                return true;
            }
        });
    }

    removeStatusByName(name: string, character: Character) {
        this.statusList = this.statusList.filter((status) => {
            if (status.name === name) {
                status.recover(character);
                status.onRemove?.(character);
                return false;
            } else {
                return true;
            }
        });
    }

    removeAllStatuses(character: Character) {
        this.recoverAll(character);
        this.statusList = [];
    }

    recoverAll(character: Character): void {
        for (const status of this.statusList) {
            status.recover(character);
            status.onRemove?.(character);
        }
    }
}

export default StatusManager;

export {
    StatusManager,
};
