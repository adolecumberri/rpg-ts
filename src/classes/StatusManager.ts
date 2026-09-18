import { EventMoment } from '../types/generalEvents.types';
import { Character } from './Character';
import { StatusInstance } from './StatusInstance';


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

        // Refresh model: re-applying a status with the same name resets
        // its duration instead of stacking another instance.
        this.removeStatusesByName(statusInstance.definition.name);

        statusInstance.definition.onAdd?.(this.character);

        this.statuses.set(statusInstance.id, statusInstance);

        if (statusInstance.definition.triggersOnAdd) {
            statusInstance.triggerInstances(this.character.stats);
            statusInstance.definition.onTrigger?.(this.character);
            this.cleanup();
        }

        return statusInstance.id;
    }

    private removeStatusesByName(name: string) {
        for (const [id, status] of this.statuses) {
            if (status.definition.name === name) {
                this.removeStatusInstance(id);
            }
        }
    }

    removeStatusInstance(id: string) {
        const status = this.statuses.get(id);
        if (!status) return;

        this.character.stats.removeModifierSource(status.getModifierSourceId());
        status.definition.onRemove?.(this.character);
        this.statuses.delete(id);
    }

    trigger(moment: EventMoment) {
        // limpiamos expirados antes de activar
        this.cleanup();

        for (const status of this.statuses.values()) {
            if (status.definition.applyOn === moment) {
                status.triggerInstances(this.character.stats);
                status.definition.onTrigger?.(this.character);
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
            this.character.stats.removeModifierSource(status.getModifierSourceId());
            status.definition.onRemove?.(this.character);
        }

        this.statuses.clear();
    }

    hasStatus(statusId: string) {
        return this.statuses.has(statusId);
    }
}
