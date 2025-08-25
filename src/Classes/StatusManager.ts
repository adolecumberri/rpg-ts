import { Character } from './Character';
import { StatusInstance } from './StatusInstance';
import { StatusDefinition } from '../types/status.types';
import { EventMoment } from '../types/generalEvents.types';


class StatusManager {
    private statuses: StatusInstance[] = [];

    add(def: StatusDefinition, character: Character) {
        const instance = new StatusInstance(def);
        def.onAdd?.(character);
        this.statuses.push(instance);
    }

    activate(moment: EventMoment, character: Character) {
        this.statuses.forEach((s: StatusInstance) => {
            if (s.definition.applyOn === moment) {
                s.activate(character.stats);
            }
        });

        this.cleanup(character);
    }

    private cleanup(character: Character) {
        this.statuses = this.statuses.filter((s: StatusInstance) => {
            if (s.isExpired()) {
                s.recover(character.stats);
                s.definition.onRemove?.(character);
                return false;
            }
            return true;
        });
    }
}

export {
    StatusManager,
};
