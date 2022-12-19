import discriminators from "../constants/discriminators";
import { mergeObjects } from "../helper";
import { getDefaultAttackObject } from "../helper/object";
import { IActivateReturn, IStatusAppliedOn } from "../interfaces/Status.Interface";
import { IStatusManagerConstructor, Constructor } from "../interfaces/StatusManager.interface";
import { CharacterClass } from "./Character";
import Status from "./Status";

class StatusManager {
    character: CharacterClass;

    originalConfig: Constructor;

    statusList: Status[] = [];

    timesActivated: 0;

    timesStatusHasBeenAdded: 0;

    constructor(config?: Constructor) {
        this.originalConfig = config

        Object.keys(config).forEach(key => {
            this[key] = config[key]
        })
    }

    /**
    * @param status single status or a list of status to add into StatusList
    */
    addStatus(status: Status[] | Status): void {
        if ((status as Status).discriminator === discriminators.STATUS) {
            (status as Status).setCharacter(this.character);
            (status as Status).onAdd()
            this.statusList.push(<Status>status);
            this.timesStatusHasBeenAdded++;
        } else {
            (status as Status[]).forEach((_, i, arr) => {
                arr[i].setCharacter(this.character)
                arr[i].onAdd()
                this.timesStatusHasBeenAdded++
            });
            this.statusList = this.statusList.concat(status);
        }
    }

    /**
    * Activates each status who's applied on "appliedOn"
    * @param appliedOn 
    * @returns Solution of every status applied
    */
    activate(appliedOn: IStatusAppliedOn): { status: IActivateReturn } {
        let finalSolution = {
            statsAffected: [],
            value: {},
            statusLastExecution: false,
        };

        this.statusList.forEach((status) => {
            if (status.appliedOn === appliedOn) {
                let statusSolution = status.activate()

                finalSolution.statsAffected.push(statusSolution.statsAffected)
                finalSolution.value = mergeObjects([finalSolution.value, statusSolution.value])
            }
            if (!status.isActive) this.removeStatusById(status.id);
        });

        return { status: finalSolution }
    }

    /**
     * remove status by Id passing status as value.
     * @param valueToRemove Status
     * @returns Removed Status 
     */
    removeStatus(valueToRemove: Status): Status {
        let removedElement: Status;
        this.statusList = this.statusList.filter((stat) => {
            if (stat.id === (valueToRemove as Status).id) {
                removedElement = stat;
                valueToRemove.onRemove()
            }
            return stat.id !== (valueToRemove as Status).id
        });

        return removedElement
    }

    /**
     * remove status by Id passing status as value.
     * @param statusId 
     * @returns Removed Status
     */
    removeStatusById(statusId: number): Status {
        let removedElement;
        this.statusList = this.statusList.filter((stat) => {
            if (stat.id === statusId) {
                removedElement = stat;
                removedElement.onRemove()
            }
            return stat.id !== statusId
        });

        return removedElement
    }
}

export default StatusManager
