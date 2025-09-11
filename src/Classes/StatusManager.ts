import { StatusDefinition } from '../types/status.types';
import { Character } from './Character';
import { StatusInstance } from './StatusInstance';

type EventMoment = string;

export class StatusManager {
    readonly character: Character;
    statuses: Map<string, StatusInstance> = new Map();
    private registeredEvents: Set<string> = new Set();

    constructor(character: Character) {
        this.character = character;

        // limpieza automática al morir
        this.character.on('after_die', () => {
            this.removeAllStatuses();
        });
    }

    add(statusInstance: StatusInstance) {
        statusInstance.definition.onAdd?.(this.character);

        if (statusInstance.definition.triggersOnAdd) {
            statusInstance.activate(this.character);
        }

        this.statuses.set(statusInstance.id, statusInstance);

        // subscribir a los eventos necesarios (solo la primera vez)
        this.ensureRegisteredFor(statusInstance.definition.applyOn);

        return statusInstance.id;
    }

    removeStatusInstance(id: string) {
        const status = this.statuses.get(id);
        if (!status) return;

        status.recover(this.character.stats);
        status.definition.onRemove?.(this.character);
        this.statuses.delete(id);
    }

    activate(moment: EventMoment) {
        // limpiamos expirados antes de activar
        this.cleanup();

        for (const status of this.statuses.values()) {
            if (status.definition.applyOn === moment) {
                status.activate(this.character);
            }
        }
    }

    private cleanup() {
        for (const [id, status] of this.statuses) {
            if (status.isExpired()) {
                status.recover(this.character.stats);
                status.definition.onRemove?.(this.character);
                this.statuses.delete(id);
            }
        }
    }

    removeAllStatuses() {
        for (const status of this.statuses.values()) {
            status.recover(this.character.stats);
            status.definition.onRemove?.(this.character);
        }
        this.statuses.clear();
        this.registeredEvents.clear();
    }

    hasStatus(statusId: string) {
        return this.statuses.has(statusId);
    }

    private ensureRegisteredFor(event: EventMoment) {
        if (this.registeredEvents.has(event)) return;
        this.character.on(event, () => this.activate(event));
        this.registeredEvents.add(event);
    }
}
