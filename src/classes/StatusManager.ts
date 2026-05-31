import { EventMoment } from "../types/generalEvents.types";
import { Character } from "./Character";
import { StatusInstance } from "./StatusInstance";



export class StatusManager {
    character: Character;
    statuses: Map<string, StatusInstance> = new Map();

    constructor(character: Character) {
        this.character = character;
    }

    addStatusInstance(statusInstance: StatusInstance) {
        if (this.statuses.has(statusInstance.id)) {
            this.removeStatusInstance(statusInstance.id);
        }

        statusInstance.definition.onAdd?.(this.character);

        this.statuses.set(statusInstance.id, statusInstance);

        if (statusInstance.definition.triggersOnAdd) {
            statusInstance.triggerInstances(this.character.stats);
            this.cleanup();
        }

        return statusInstance.id;
    }

    removeStatusInstance(id: string) {
        const status = this.statuses.get(id);
        if (!status) return;

        status.definition.onRemove?.(this.character);
        this.statuses.delete(id);
    }

    trigger(moment: EventMoment) {
        // limpiamos expirados antes de activar
        this.cleanup();

        for (const status of this.statuses.values()) {
            if (status.definition.applyOn === moment) {
                status.triggerInstances(this.character.stats);
            }
        }

        // remove statuses that expired during this trigger cycle
        this.cleanup();
    }

    private cleanup() {
        for (const [id, status] of this.statuses) {
            if (status.isExpired()) {
                this.removeStatusInstance(id);
            }
        }
    }

    removeAllStatuses() {
        for (const status of this.statuses.values()) {
            status.definition.onRemove?.(this.character);
        }

        this.statuses.clear();
    }

    hasStatus(statusId: string) {
        return this.statuses.has(statusId);
    }

}