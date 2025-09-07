import { Character } from './Character';
import { StatusInstance } from './StatusInstance';
import { StatusDefinition } from '../types/status.types';

type EventMoment = string; // antes ya lo tenías

class StatusManager {
    readonly character: Character;
    statuses: StatusInstance[] = [];

    constructor({ character }: { character: Character }) {
        this.character = character;

        // Nos registramos una sola vez en la muerte
        this.character.on('after_die', () => {
            this.removeAllStatuses();
        });
    }

    add(def: StatusInstance, character: Character) {
        def.onAdd?.(character);

        // Si el status tiene triggersOnAdd, se activa una vez al añadirse
        def.definition.triggersOnAdd && def.activate(character.stats);

        this.statuses.push(def);

        // Nos registramos en el evento correspondiente
        this.character.on(def.definition.applyOn, () => {
            this.activate(def.definition.applyOn);
        });
    }

    activate(moment: EventMoment) {
        this.cleanup();

        this.statuses.forEach((s) => {
            if (s.definition.applyOn === moment) {
                s.activate(this.character.stats);
            }
        });
    }

    private cleanup() {
        this.statuses = this.statuses.filter((s) => {
            if (!s.isExpired()) {
                return true;
            }

            s.definition.statsAffected.map((stat) => {
                if (stat.recovers) {
                    s.recover(this.character.stats);
                    s.definition.onRemove?.(this.character);
                    return false;
                }
            });
        });
    }

    removeAllStatuses() {
        for (const s of this.statuses) {
            s.recover(this.character.stats);
            s.definition.onRemove?.(this.character);
        }
        this.statuses = [];
    }
}

export { StatusManager };
