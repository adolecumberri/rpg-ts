import { uniqueID } from '../helpers/common.helpers';
import { Character } from './Character';
import { STATUS_DURATIONS, STATUS_TYPES, STATUS_USAGE_FREQUENCY } from '../constants/status.constants';

import { Stats } from './Stats';
import { StatusDefinition, StatusDurationTemporal, StatusInstanceConstructor } from '../types/status.types';
import { ACTION_HANDLERS } from '../helpers/status.helper';


class StatusInstance {
    readonly definition: StatusDefinition;
    readonly id: string;
    private timesUsed;
    private valueToRecover: Record<string, number>;

    constructor(config: StatusInstanceConstructor) {
        this.definition = config.definition;
        this.id = config.id ?? uniqueID();
        this.timesUsed = config.timesUsed ?? 0;
        this.valueToRecover = config.valueToRecover ?? {};
    }

    activate(characterStats: Stats<any>) {
        if (!this.canActivate()) return;

        for (const stat of this.definition.statsAffected) {
            const handler = ACTION_HANDLERS[stat.type];
            const result = handler({
                from: characterStats.getProp(stat.from),
                to: characterStats.getProp(stat.to),
                value: stat.value,
            });

            characterStats.setProp(stat.to, result.finalValue as number);

            if (stat.recovers) {
                const key = String(stat.to);
                this.valueToRecover[key] = (this.valueToRecover[key] ?? 0) + result.appliedValue;
            }
        }

        if (this.definition.duration.type === STATUS_DURATIONS.TEMPORAL) {
            (this.definition.duration as StatusDurationTemporal).value!--;
        }

        this.timesUsed++;
    }

    canActivate(): boolean {
        const { type } = this.definition.duration;

        if (type === STATUS_DURATIONS.PERMANENT) {
            if (this.definition.usageFrequency === STATUS_USAGE_FREQUENCY.PER_ACTION) return true;
            if (this.definition.usageFrequency === STATUS_USAGE_FREQUENCY.ONCE) {
                return !this.hasBeenUsed();
            };
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
        for (const [prop, totalApplied] of Object.entries(this.valueToRecover)) {
            const current = characterStats.getProp(prop as any) as number;
            characterStats.setProp(prop as any, current - totalApplied);
        }

        // Limpia el acumulado tras recuperar
        this.valueToRecover = {};
    }

    getRecoveryMap(): Readonly<Record<string, number>> {
        return this.valueToRecover;
    }

    onAdd(character: Character) {
        this.definition.onAdd?.(character);
    }

    onRemove(character: Character) {
        this.definition.onRemove?.(character);
    }
}

export {
    StatusInstance,
};
