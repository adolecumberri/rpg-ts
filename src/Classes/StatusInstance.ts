import { uniqueID } from '../helpers/common.helpers';
import { Character } from './Character';
import { STATUS_DURATIONS, STATUS_TYPES, STATUS_USAGE_FREQUENCY } from '../constants/status.constants';

import { Stats } from './Stats';
import { StatusDefinition, StatusDurationTemporal } from '../types/status.types';
import { ACTION_HANDLERS } from '../helpers/status.helper';


class StatusInstance {
    readonly definition: StatusDefinition;
    readonly id: string = uniqueID();
    private timesUsed = 0;

    constructor(definition: StatusDefinition) {
        this.definition = definition;
    }

    activate(characterStats: Stats<any>) {
        if (!this.canActivate()) return;

        for (const stat of this.definition.statsAffected) {
            const action = ACTION_HANDLERS[stat.type];
            const result = action({
                from: characterStats.getProp(stat.from),
                to: characterStats.getProp(stat.to),
                value: stat.value,
            });

            characterStats.setProp(stat.to, result.finalValue as number);

            // guardar para recovery
            stat.valueToRecover = result.appliedValue;
        }

        if (this.definition.duration.type === STATUS_DURATIONS.TEMPORAL) {
            (this.definition.duration as StatusDurationTemporal).value!--;
        }

        this.timesUsed++;
    }

    private canActivate(): boolean {
        const { type } = this.definition.duration;

        if (type === STATUS_DURATIONS.PERMANENT) {
            if (this.definition.usageFrequency === STATUS_USAGE_FREQUENCY.PER_ACTION) return true;
            if (this.definition.usageFrequency === STATUS_USAGE_FREQUENCY.ONCE && this.hasBeenUsed()) return true;
            return false;
        }

        if (type === STATUS_DURATIONS.TEMPORAL) {
            return (this.definition.duration.value ?? 0) > 0;
        }

        return false;
    }

    hasBeenUsed(): boolean {
        return this.timesUsed > 0;
    }

    isExpired(): boolean {
        const { type } = this.definition.duration;

        if (type === STATUS_DURATIONS.PERMANENT) {
            return false;
        }

        if (type === STATUS_DURATIONS.TEMPORAL) {
            return (this.definition.duration as StatusDurationTemporal).value === 0;
        }

        return true;
    }

    recover(characterStats: Stats<any>) {
        for (const stat of this.definition.statsAffected) {
            if (!stat.recovers) continue;
            const current = characterStats.getProp(stat.to);
            characterStats.setProp(stat.to, current - (stat.valueToRecover ?? 0));
        }
    }
}

export {
    StatusInstance,
};
