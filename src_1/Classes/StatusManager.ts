import { EventMoment } from '../types/generalEvents.types';
import { StatusDefinition } from '../types/status.types';
import { Character } from './Character';
import { StatusInstance } from './StatusInstance';

export class StatusManager {
    readonly character: Character;
    statuses: Map<string, StatusInstance> = new Map();

    constructor(character: Character) {
        this.character = character;

        // limpieza automática al morir
        this.character.on('on_die', () => {
            this.removeAllStatuses();
        });
    }

    addStatusInstance(statusInstance: StatusInstance) {
        statusInstance.definition.onAdd?.(this.character);

        this.statuses.set(statusInstance.id, statusInstance);

        // subscribir a los evento (acumulable en el array.)
        this.character.on(statusInstance.definition.applyOn, () => this.trigger(statusInstance.definition.applyOn));

        if (statusInstance.definition.triggersOnAdd) {
            statusInstance.triggerInstances(this.character.stats);
            this.cleanup();
        }

        return statusInstance.id;
    }

    removeStatusInstance(id: string) {
        const status = this.statuses.get(id);
        if (!status) return;

        status.remove(this.character);

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
            status.remove(this.character);
        }
        this.statuses.clear();
    }

    hasStatus(statusId: string) {
        return this.statuses.has(statusId);
    }


}
