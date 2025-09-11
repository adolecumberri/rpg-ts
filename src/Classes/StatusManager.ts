import { StatusDefinition } from '../types/status.types';
import { Character } from './Character';
import { StatusInstance } from './StatusInstance';

type EventMoment = string;

export class StatusManager {
    readonly character: Character;
    statuses: StatusInstance[] = [];
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

        this.statuses.push(statusInstance);

        // subscribir a los eventos necesarios (solo la primera vez)
        this.ensureRegisteredFor(statusInstance.definition.applyOn);
    }

    activate(moment: EventMoment) {
        // limpiamos expirados antes de activar
        this.cleanup();

        for (const s of this.statuses) {
            if (s.definition.applyOn === moment) {
                s.activate(this.character);
            }
        }

        // limpiamos expirados tras activaciones
        this.cleanup();
    }

    private cleanup() {
        this.statuses = this.statuses.filter((s) => {
            if (s.isExpired()) {
                s.recover(this.character.stats);
                s.definition.onRemove?.(this.character);
                return false;
            }
            return true;
        });
    }

    removeAllStatuses() {
        for (const s of this.statuses) {
            s.recover(this.character.stats);
            s.definition.onRemove?.(this.character);
        }
        this.statuses = [];
        // not strictly necessary, pero limpiamos el set de eventos
        this.registeredEvents.clear();
    }

    hasStatus(statusId: string) {
        return this.statuses.some((s) => s.id === statusId);
    }

    private ensureRegisteredFor(event: EventMoment) {
        if (this.registeredEvents.has(event)) return;
        this.character.on(event, () => this.activate(event));
        this.registeredEvents.add(event);
    }
}
